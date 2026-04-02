import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CalendarPickerModal from '../../components/common/CalendarPickerModal';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, ScreenContainer, ScreenHeader, Button } from '../../components/common';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import {
  useOrderRequestDetail,
  useUpdateOrderRequestStatus,
  useOrderRequestMessages,
  useSendOrderRequestMessage,
} from '../../hooks/useOrderRequests';
import { orderRequestService } from '../../api/services/orderRequestService';
import { OrderEntity, OrderEntityMessage, ORDER_STATUS_LABELS } from '../../types/orderRequest';
import { useAuthStore } from '../../store/authStore';
import { RootStackParamList } from '../../navigation/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderRequestDetailRouteProp = RouteProp<
  { OrderRequestDetail: { orderRequestId: string } },
  'OrderRequestDetail'
>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pending: 'rgb(47, 126, 216)',
  submitted: 'rgb(47, 126, 216)',
  approved: 'rgb(69, 139, 0)',
  rejected: 'rgb(196, 57, 38)',
  canceled: 'rgb(196, 57, 38)',
};

const withOpacity = (rgbColor: string, opacity: number): string =>
  rgbColor.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);

const STATUS_DISPLAY_LABELS: Record<string, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  approved: 'Accepted',
  rejected: 'Rejected',
  canceled: 'Canceled',
};

const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatOrderCode = (id: string): string => {
  const short = id.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `OE-${short}`;
};

const TIMEZONE = 'America/Chicago';

// Get timezone-aware date/time parts from a Date object
const getPartsInTimezone = (d: Date): { month: string; day: string; year: string; hours: string; minutes: string; tzAbbr: string } => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });
  const parts = formatter.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return {
    month: get('month'),
    day: get('day'),
    year: get('year'),
    hours: get('hour').padStart(2, '0'),
    minutes: get('minute').padStart(2, '0'),
    tzAbbr: get('timeZoneName'),
  };
};

// Format a date-only string like "2026-03-20" (no timezone conversion needed)
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    // Date-only strings (YYYY-MM-DD): parse directly to avoid UTC shift
    const dateOnly = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      return `${dateOnly[2]}/${dateOnly[3]}/${dateOnly[1]}`;
    }
    // Full timestamp: convert to America/Chicago
    const d = new Date(dateStr);
    const p = getPartsInTimezone(d);
    return `${p.month}/${p.day}/${p.year}`;
  } catch {
    return dateStr;
  }
};

// Format a time string like "14:30:00" with timezone abbreviation
const formatTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '-';
  try {
    if (/^\d{2}:\d{2}/.test(timeStr)) {
      const [h, m] = timeStr.split(':').map(Number);
      // Use a reference date to get the timezone abbreviation
      const ref = new Date();
      const p = getPartsInTimezone(ref);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p.tzAbbr}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
};

// Format a full ISO timestamp like "2026-03-31T07:11:24+00:00" → "03/31/2026 02:11 CDT"
const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const p = getPartsInTimezone(d);
    return `${p.month}/${p.day}/${p.year} ${p.hours}:${p.minutes} ${p.tzAbbr}`;
  } catch {
    return dateStr;
  }
};

// Format timestamp for chat messages
const formatTimestamp = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    const p = getPartsInTimezone(d);
    return `${p.hours}:${p.minutes} ${p.tzAbbr}`;
  } catch {
    return '';
  }
};

const formatDateSeparator = (dateStr: string): string => {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const messageDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (messageDate.getTime() === today.getTime()) return 'Today';
  if (messageDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const isDifferentDay = (a: string, b: string): boolean => {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  );
};

const computeTruckRate = (truckSpacing: number | null): string => {
  if (!truckSpacing || truckSpacing <= 0) return '-';
  return `${(60 / truckSpacing).toFixed(1)} CY/HR`;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface InfoRowProps {
  label: string;
  value: string | null | undefined;
  isDark: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, isDark }) => {
  const textColor = isDark ? colors.dark.text.primary : colors.light.text.primary;
  const secondaryColor = isDark ? colors.dark.text.secondary : colors.light.text.secondary;
  return (
    <View style={infoRowStyles.row}>
      <Text variant="bodySmall" style={[infoRowStyles.label, { color: secondaryColor }]}>
        {label}
      </Text>
      <Text variant="body" style={[infoRowStyles.value, { color: textColor }]} numberOfLines={2}>
        {value || '-'}
      </Text>
    </View>
  );
};

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: ms(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  label: {
    flex: 0.4,
    fontWeight: '500',
  },
  value: {
    flex: 0.6,
    textAlign: 'right',
  },
});

// ---------------------------------------------------------------------------
// Quick Stat Card
// ---------------------------------------------------------------------------

interface QuickStatCardProps {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  bgColor: string;
  isDark: boolean;
}

const QuickStatCard: React.FC<QuickStatCardProps> = ({ icon, label, value, sub, bgColor, isDark }) => {
  const cardBg = isDark ? colors.dark.card : colors.light.card;
  const textColor = isDark ? colors.dark.text.primary : colors.light.text.primary;
  const secondaryColor = isDark ? colors.dark.text.secondary : colors.light.text.secondary;
  return (
    <View style={[quickStatStyles.card, { backgroundColor: cardBg }]}>
      <View style={[quickStatStyles.iconCircle, { backgroundColor: bgColor + '22' }]}>
        <Icon name={icon} size={ms(20)} color={bgColor} />
      </View>
      <Text variant="caption" style={[quickStatStyles.label, { color: secondaryColor }]} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="bodySmall" style={[quickStatStyles.value, { color: textColor }]} numberOfLines={1}>
        {value}
      </Text>
      {!!sub && (
        <Text variant="caption" style={{ color: secondaryColor, marginTop: ms(2) }} numberOfLines={1}>
          {sub}
        </Text>
      )}
    </View>
  );
};

const quickStatStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: ms(12),
    padding: ms(12),
    alignItems: 'center',
    minHeight: ms(100),
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  iconCircle: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ms(6),
  },
  label: {
    marginBottom: ms(2),
    textAlign: 'center',
  },
  value: {
    fontWeight: '700',
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Section Card
// ---------------------------------------------------------------------------

interface SectionCardProps {
  title: string;
  icon: string;
  headerColor: string;
  children: React.ReactNode;
  isDark: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, icon, headerColor, children, isDark }) => {
  const cardBg = isDark ? colors.dark.card : colors.light.card;
  return (
    <View style={[sectionCardStyles.card, { backgroundColor: cardBg }]}>
      <View style={[sectionCardStyles.header, { backgroundColor: headerColor }]}>
        <Icon name={icon} size={ms(18)} color="#FFFFFF" />
        <Text variant="bodySmall" style={sectionCardStyles.headerText}>
          {title}
        </Text>
      </View>
      <View style={sectionCardStyles.body}>{children}</View>
    </View>
  );
};

const sectionCardStyles = StyleSheet.create({
  card: {
    borderRadius: ms(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: ms(16),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(10),
    paddingHorizontal: ms(14),
  },
  headerText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: ms(8),
  },
  body: {
    padding: ms(14),
  },
});

// ---------------------------------------------------------------------------
// Product Row
// ---------------------------------------------------------------------------

interface ProductRowProps {
  label: string;
  code: string | null;
  name: string | null;
  quantity?: number | null;
  slump?: string | null;
  notes?: string | null;
  isDark: boolean;
}

const ProductRow: React.FC<ProductRowProps> = ({ label, code, name, quantity, slump, notes, isDark }) => {
  const textColor = isDark ? colors.dark.text.primary : colors.light.text.primary;
  const secondaryColor = isDark ? colors.dark.text.secondary : colors.light.text.secondary;
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const hasData = code || name || quantity || slump || notes;
  if (!hasData) return null;

  return (
    <View style={[productRowStyles.container, { borderBottomColor: borderColor }]}>
      <Text variant="bodySmall" style={[productRowStyles.label, { color: colors.primary.main }]}>
        {label}
      </Text>
      {code ? (
        <View style={productRowStyles.row}>
          <Text variant="caption" style={{ color: secondaryColor }}>Code:</Text>
          <Text variant="bodySmall" style={{ color: textColor, marginLeft: ms(4) }}>{code}</Text>
        </View>
      ) : null}
      {name ? (
        <View style={productRowStyles.row}>
          <Text variant="caption" style={{ color: secondaryColor }}>Name:</Text>
          <Text variant="bodySmall" style={{ color: textColor, marginLeft: ms(4), flex: 1 }} numberOfLines={2}>
            {name}
          </Text>
        </View>
      ) : null}
      {quantity != null ? (
        <View style={productRowStyles.row}>
          <Text variant="caption" style={{ color: secondaryColor }}>Qty:</Text>
          <Text variant="bodySmall" style={{ color: textColor, marginLeft: ms(4) }}>{String(quantity)}</Text>
        </View>
      ) : null}
      {slump ? (
        <View style={productRowStyles.row}>
          <Text variant="caption" style={{ color: secondaryColor }}>Slump:</Text>
          <Text variant="bodySmall" style={{ color: textColor, marginLeft: ms(4) }}>{slump}</Text>
        </View>
      ) : null}
      {notes ? (
        <View style={productRowStyles.row}>
          <Text variant="caption" style={{ color: secondaryColor }}>Notes:</Text>
          <Text variant="bodySmall" style={{ color: textColor, marginLeft: ms(4), flex: 1 }} numberOfLines={3}>
            {notes}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const productRowStyles = StyleSheet.create({
  container: {
    paddingVertical: ms(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontWeight: '700',
    marginBottom: ms(4),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: ms(2),
  },
});

// ---------------------------------------------------------------------------
// Message Bubble
// ---------------------------------------------------------------------------

interface ChatBubbleProps {
  message: OrderEntityMessage;
  isOwn: boolean;
  showDateSeparator: boolean;
  dateSeparatorText: string;
  isDark: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwn,
  showDateSeparator,
  dateSeparatorText,
  isDark,
}) => {
  const ownBubbleBg = isDark ? colors.chat.dark.sentBubble : colors.chat.light.sentBubble;
  const otherBubbleBg = isDark ? colors.chat.dark.receivedBubble : colors.chat.light.receivedBubble;
  const ownTextColor = isDark ? colors.chat.dark.textPrimary : colors.chat.light.textPrimary;
  const otherTextColor = isDark ? colors.chat.dark.textPrimary : colors.chat.light.textPrimary;
  const timeColor = isDark ? colors.chat.dark.timeText : colors.chat.light.timeText;
  const dateSepBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const dateSepText = isDark ? colors.dark.text.secondary : colors.light.text.secondary;

  return (
    <View>
      {showDateSeparator && (
        <View style={chatBubbleStyles.dateSeparator}>
          <View style={[chatBubbleStyles.dateSeparatorPill, { backgroundColor: dateSepBg }]}>
            <Text variant="captionSmall" style={{ color: dateSepText, fontWeight: '600' }}>
              {dateSeparatorText}
            </Text>
          </View>
        </View>
      )}
      <View
        style={[
          chatBubbleStyles.bubbleRow,
          isOwn ? chatBubbleStyles.ownRow : chatBubbleStyles.otherRow,
        ]}
      >
        <View
          style={[
            chatBubbleStyles.bubble,
            {
              backgroundColor: isOwn ? ownBubbleBg : otherBubbleBg,
              borderTopLeftRadius: isOwn ? ms(16) : ms(4),
              borderTopRightRadius: isOwn ? ms(4) : ms(16),
            },
          ]}
        >
          {!isOwn && (
            <Text variant="captionSmall" style={[chatBubbleStyles.senderName, { color: colors.primary.main }]}>
              {message.sender_name} ({message.sender_role})
            </Text>
          )}
          <Text variant="bodySmall" style={{ color: isOwn ? ownTextColor : otherTextColor }}>
            {message.message_text}
          </Text>
          <Text variant="captionSmall" style={[chatBubbleStyles.timestamp, { color: timeColor }]}>
            {formatTimestamp(message.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const chatBubbleStyles = StyleSheet.create({
  dateSeparator: {
    alignItems: 'center',
    marginVertical: ms(12),
  },
  dateSeparatorPill: {
    paddingHorizontal: ms(14),
    paddingVertical: ms(4),
    borderRadius: ms(12),
  },
  bubbleRow: {
    paddingHorizontal: ms(12),
    marginBottom: ms(6),
  },
  ownRow: {
    alignItems: 'flex-end',
  },
  otherRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: ms(10),
    borderBottomLeftRadius: ms(16),
    borderBottomRightRadius: ms(16),
  },
  senderName: {
    fontWeight: '700',
    marginBottom: ms(2),
  },
  timestamp: {
    alignSelf: 'flex-end',
    marginTop: ms(4),
  },
});

// ---------------------------------------------------------------------------
// Order Status Dropdown (Modal-based picker)
// ---------------------------------------------------------------------------

interface OrderStatusDropdownProps {
  value: number | null;
  onChange: (val: number | null) => void;
  isDark: boolean;
}

const OrderStatusDropdown: React.FC<OrderStatusDropdownProps> = ({ value, onChange, isDark }) => {
  const [visible, setVisible] = useState(false);
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
  const textColor = isDark ? colors.dark.text.primary : colors.light.text.primary;
  const modalBg = isDark ? colors.dark.surface : colors.light.surface;
  const modalBorder = isDark ? colors.dark.border : colors.light.border;

  const selectedLabel = value !== null && value !== undefined
    ? ORDER_STATUS_LABELS[value] ?? 'Select'
    : 'Select';

  return (
    <>
      <TouchableOpacity
        style={[
          dropdownStyles.input,
          { backgroundColor: inputBg, borderColor: inputBorder },
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text variant="bodySmall" style={{ color: textColor, flex: 1 }}>{selectedLabel}</Text>
        <Icon name="chevron-down" size={ms(16)} color={textColor} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={dropdownStyles.modalOverlay}>
          <View style={[dropdownStyles.modalContainer, { backgroundColor: modalBg }]}>
            <View style={[dropdownStyles.modalHeader, { borderBottomColor: modalBorder }]}>
              <Text variant="h3" style={{ flex: 1 }}>Select Order Status</Text>
              <TouchableOpacity onPress={() => setVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={ms(24)} color={textColor} />
              </TouchableOpacity>
            </View>
            {ORDER_STATUS_OPTIONS.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    dropdownStyles.modalItem,
                    isSelected && { backgroundColor: colors.primary.main + '12' },
                  ]}
                  onPress={() => {
                    onChange(opt.value);
                    setVisible(false);
                  }}
                >
                  <Text
                    variant="body"
                    style={isSelected ? { color: colors.primary.main, fontWeight: '600' } : { color: textColor }}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && <Icon name="check" size={ms(20)} color={colors.primary.main} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
};

const dropdownStyles = StyleSheet.create({
  input: {
    height: ms(40),
    borderRadius: ms(8),
    borderWidth: 1,
    paddingHorizontal: ms(10),
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: ms(20),
    borderTopRightRadius: ms(20),
    paddingBottom: ms(30),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(20),
    paddingVertical: ms(16),
    borderBottomWidth: 1,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(20),
    paddingVertical: ms(14),
  },
});

// ===========================================================================
// MAIN SCREEN
// ===========================================================================

export const OrderRequestDetailScreen: React.FC = () => {
  const route = useRoute<OrderRequestDetailRouteProp>();
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const { orderRequestId } = route.params;

  // Data hooks
  const { order, isLoading, isError, refetch } = useOrderRequestDetail(orderRequestId);
  const { messages, isLoading: messagesLoading, refetch: refetchMessages } = useOrderRequestMessages(orderRequestId);
  const updateStatusMutation = useUpdateOrderRequestStatus();
  const sendMessageMutation = useSendOrderRequestMessage();

  // Local state
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<number | null>(null);
  const [verificationDate, setVerificationDate] = useState('');
  const [verificationTime, setVerificationTime] = useState('');
  const [showVerifyDatePicker, setShowVerifyDatePicker] = useState(false);
  const [showVerifyTimePicker, setShowVerifyTimePicker] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Theme
  const bgColor = isDark ? colors.dark.background : colors.light.background;
  const cardBg = isDark ? colors.dark.card : colors.light.card;
  const surfaceBg = isDark ? colors.dark.surface : colors.light.surface;
  const textColor = isDark ? colors.dark.text.primary : colors.light.text.primary;
  const secondaryTextColor = isDark ? colors.dark.text.secondary : colors.light.text.secondary;
  const borderColor = isDark ? colors.dark.border : colors.light.border;
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';

  // Populate verification fields from order on load
  React.useEffect(() => {
    if (order) {
      if (order.order_number) setOrderNumber(order.order_number);
      if (order.order_status !== null && order.order_status !== undefined)
        setSelectedOrderStatus(order.order_status);
      if (order.on_job_date) setVerificationDate(order.on_job_date);
      if (order.on_job_time) setVerificationTime(order.on_job_time);
    }
  }, [order]);

  // ----- Actions -----

  const handleAccept = useCallback(async () => {
    if (!order) return;

    if (!orderNumber.trim()) {
      Alert.alert('Validation Error', 'Order Number is required to accept this order request.');
      return;
    }

    setIsAccepting(true);
    try {
      // Update verification data first
      await orderRequestService.updateVerification(order.id, {
        order_number: orderNumber.trim(),
        order_status: selectedOrderStatus,
        on_job_date: verificationDate || undefined,
        on_job_time: verificationTime || undefined,
      });

      // Then update status
      await updateStatusMutation.mutateAsync({ id: order.id, status: 'approved' });
      Alert.alert('Success', 'Order request has been accepted.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to accept order request.');
    } finally {
      setIsAccepting(false);
    }
  }, [order, orderNumber, selectedOrderStatus, verificationDate, verificationTime, updateStatusMutation]);

  const handleReject = useCallback(() => {
    if (!order) return;
    Alert.alert(
      'Reject Order Request',
      'Are you sure you want to reject this order request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setIsRejecting(true);
            try {
              await updateStatusMutation.mutateAsync({ id: order.id, status: 'rejected' });
              Alert.alert('Rejected', 'Order request has been rejected.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to reject order request.');
            } finally {
              setIsRejecting(false);
            }
          },
        },
      ],
    );
  }, [order, updateStatusMutation]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !order) return;
    const role = user?.role || 'customer';
    try {
      await sendMessageMutation.mutateAsync({
        id: order.id,
        messageText: messageText.trim(),
        senderRole: role,
      });
      setMessageText('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send message.');
    }
  }, [messageText, order, user, sendMessageMutation]);

  // ----- Loading / Error States -----

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Order Request" showBackButton />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text variant="body" color="secondary" style={{ marginTop: ms(12) }}>
            Loading order request...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !order) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Order Request" showBackButton />
        <View style={styles.centered}>
          <Icon name="alert-circle-outline" size={ms(48)} color={colors.error.main} />
          <Text variant="body" color="secondary" style={{ marginTop: ms(12) }}>
            Failed to load order request.
          </Text>
          <Button title="Retry" variant="primary" onPress={() => refetch()} style={{ marginTop: ms(16) }} />
        </View>
      </ScreenContainer>
    );
  }

  // ----- Derived Data -----

  const status = order.status;
  const statusColor = STATUS_COLORS[status] || colors.grey[50];
  const isPendingOrSubmitted = status === 'pending' || status === 'submitted';
  const orderCode = formatOrderCode(order.id);
  const truckRate = computeTruckRate(order.truck_spacing);

  // Process messages for date separators
  const processedMessages = messages.map((msg, idx) => {
    const showDateSep =
      idx === 0 || isDifferentDay(messages[idx - 1].created_at, msg.created_at);
    return {
      ...msg,
      showDateSeparator: showDateSep,
      dateSeparatorText: showDateSep ? formatDateSeparator(msg.created_at) : '',
    };
  });

  // ----- Render -----

  return (
    <ScreenContainer>
      <ScreenHeader title={orderCode} showBackButton />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + ms(24) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ========== HEADER INFO ========== */}
          <View style={[styles.headerCard, { backgroundColor: cardBg }]}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text variant="h3" style={{ color: textColor, fontWeight: '700' }}>
                  {orderCode}
                </Text>
                <Text variant="caption" style={{ color: secondaryTextColor, marginTop: ms(2) }}>
                  Created {formatDateTime(order.created_at)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: withOpacity(statusColor, 0.12), borderColor: statusColor },
                ]}
              >
                <Text
                  variant="captionSmall"
                  style={{ color: statusColor, fontWeight: '700' }}
                >
                  {STATUS_DISPLAY_LABELS[status] ?? status}
                </Text>
              </View>
            </View>
          </View>

          {/* ========== ACCEPT / REJECT / UPDATE SECTION ========== */}
          {isPendingOrSubmitted && (
            <View style={[styles.actionSection, { backgroundColor: cardBg }]}>
              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.success.main },
                  ]}
                  onPress={handleAccept}
                  disabled={isAccepting}
                  activeOpacity={0.7}
                >
                  {isAccepting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Icon name="check-circle" size={ms(18)} color="#FFF" />
                      <Text variant="buttonSmall" style={styles.actionBtnText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: 'transparent',
                      borderWidth: 1.5,
                      borderColor: colors.error.main,
                    },
                  ]}
                  onPress={handleReject}
                  disabled={isRejecting}
                  activeOpacity={0.7}
                >
                  {isRejecting ? (
                    <ActivityIndicator size="small" color={colors.error.main} />
                  ) : (
                    <>
                      <Icon name="close-circle" size={ms(18)} color={colors.error.main} />
                      <Text
                        variant="buttonSmall"
                        style={[styles.actionBtnText, { color: colors.error.main }]}
                      >
                        Reject
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.primary.main },
                  ]}
                  onPress={() =>
                    (navigation as any).navigate('CreateOrderRequest', {
                      editOrderId: order.id,
                      orderType: order.order_type,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Icon name="pencil" size={ms(18)} color="#FFF" />
                  <Text variant="buttonSmall" style={styles.actionBtnText}>Update</Text>
                </TouchableOpacity>
              </View>

              {/* Verification Fields */}
              <View style={styles.verificationSection}>
                <Text variant="bodySmall" style={{ color: secondaryTextColor, fontWeight: '600', marginBottom: ms(10) }}>
                  Verification Details
                </Text>

                {/* Row 1: Order Number + Order Status */}
                <View style={styles.verificationRow}>
                  <View style={[styles.verificationField, { flex: 1, marginRight: ms(8) }]}>
                    <Text variant="captionSmall" style={{ color: secondaryTextColor, marginBottom: ms(4) }}>
                      Order Number *
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: inputBg,
                          borderColor: inputBorder,
                          color: textColor,
                        },
                      ]}
                      value={orderNumber}
                      onChangeText={setOrderNumber}
                      placeholder="Enter order #"
                      placeholderTextColor={isDark ? colors.dark.text.hint : colors.light.text.hint}
                    />
                  </View>
                  <View style={[styles.verificationField, { flex: 1 }]}>
                    <Text variant="captionSmall" style={{ color: secondaryTextColor, marginBottom: ms(4) }}>
                      Order Status
                    </Text>
                    <OrderStatusDropdown
                      value={selectedOrderStatus}
                      onChange={setSelectedOrderStatus}
                      isDark={isDark}
                    />
                  </View>
                </View>

                {/* Row 2: Date + Time */}
                <View style={[styles.verificationRow, { marginTop: ms(10) }]}>
                  <View style={[styles.verificationField, { flex: 1, marginRight: ms(8) }]}>
                    <Text variant="captionSmall" style={{ color: secondaryTextColor, marginBottom: ms(4) }}>
                      Date
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: inputBg,
                          borderColor: inputBorder,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                      onPress={() => setShowVerifyDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text
                        variant="bodySmall"
                        style={{ color: verificationDate ? textColor : (isDark ? colors.dark.text.hint : colors.light.text.hint) }}
                      >
                        {verificationDate ? formatDate(verificationDate) : 'Select date'}
                      </Text>
                      <Icon name="calendar" size={ms(16)} color={secondaryTextColor} />
                    </TouchableOpacity>
                    <CalendarPickerModal
                      visible={showVerifyDatePicker}
                      selectedDate={verificationDate}
                      onSelect={(date) => setVerificationDate(date)}
                      onClose={() => setShowVerifyDatePicker(false)}
                      isDark={isDark}
                      title="Verify Order Date"
                    />
                  </View>
                  <View style={[styles.verificationField, { flex: 1 }]}>
                    <Text variant="captionSmall" style={{ color: secondaryTextColor, marginBottom: ms(4) }}>
                      Time
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: inputBg,
                          borderColor: inputBorder,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                      onPress={() => setShowVerifyTimePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text
                        variant="bodySmall"
                        style={{ color: verificationTime ? textColor : (isDark ? colors.dark.text.hint : colors.light.text.hint) }}
                      >
                        {verificationTime ? verificationTime.substring(0, 5) : 'Select time'}
                      </Text>
                      <Icon name="clock-outline" size={ms(16)} color={secondaryTextColor} />
                    </TouchableOpacity>
                    {showVerifyTimePicker && (
                      <DateTimePicker
                        value={
                          verificationTime
                            ? (() => { const [h, m] = verificationTime.split(':').map(Number); const d = new Date(); d.setHours(h, m); return d; })()
                            : new Date()
                        }
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_e: DateTimePickerEvent, d?: Date) => {
                          setShowVerifyTimePicker(Platform.OS === 'ios');
                          if (d) {
                            const h = String(d.getHours()).padStart(2, '0');
                            const m = String(d.getMinutes()).padStart(2, '0');
                            setVerificationTime(`${h}:${m}`);
                          }
                        }}
                      />
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ========== QUICK STATS (2x2) ========== */}
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <QuickStatCard
                icon="clipboard-text-outline"
                label="Order Status"
                value={
                  order.order_status !== null && order.order_status !== undefined
                    ? ORDER_STATUS_LABELS[order.order_status] || '-'
                    : '-'
                }
                bgColor="#7C3AED"
                isDark={isDark}
              />
              <View style={{ width: ms(12) }} />
              <QuickStatCard
                icon="calendar-month-outline"
                label="On Job Date"
                value={formatDate(order.on_job_date)}
                sub={order.on_job_time ? formatTime(order.on_job_time) : undefined}
                bgColor="#0EA5E9"
                isDark={isDark}
              />
            </View>
            <View style={[styles.statsRow, { marginTop: ms(12) }]}>
              <QuickStatCard
                icon="truck-outline"
                label="Truck Rate"
                value={truckRate}
                bgColor="#14B8A6"
                isDark={isDark}
              />
              <View style={{ width: ms(12) }} />
              <QuickStatCard
                icon="package-variant"
                label="Quantity"
                value={order.quantity != null ? `${order.quantity} CY` : '-'}
                bgColor="#F59E0B"
                isDark={isDark}
              />
            </View>
          </View>

          {/* ========== JOB DETAILS ========== */}
          <SectionCard
            title="Job Details"
            icon="briefcase-outline"
            headerColor={colors.secondary.main}
            isDark={isDark}
          >
            <InfoRow label="Company" value={order.company_name} isDark={isDark} />
            <InfoRow label="Job Name" value={order.job_name} isDark={isDark} />
            <InfoRow label="Usage" value={order.usage_name || order.usage_code} isDark={isDark} />
            <InfoRow label="P.O. #" value={order.po_number} isDark={isDark} />
          </SectionCard>

          {/* ========== JOB LOCATION ========== */}
          <SectionCard
            title="Job Location"
            icon="map-marker-outline"
            headerColor="#14B8A6"
            isDark={isDark}
          >
            <InfoRow label="Address" value={order.job_address} isDark={isDark} />
            <InfoRow
              label="City / State / Zip"
              value={
                [order.job_city, order.job_state, order.job_zip_code]
                  .filter(Boolean)
                  .join(', ') || '-'
              }
              isDark={isDark}
            />
            <InfoRow label="Job Name" value={order.job_name} isDark={isDark} />
          </SectionCard>

          {/* ========== JOBSITE CONTACT ========== */}
          <SectionCard
            title="Jobsite Contact"
            icon="account-outline"
            headerColor="#8B5CF6"
            isDark={isDark}
          >
            <InfoRow label="Name" value={order.job_contact_name} isDark={isDark} />
            <InfoRow label="Phone" value={order.job_contact_phone} isDark={isDark} />
          </SectionCard>

          {/* ========== PRODUCTS ========== */}
          <SectionCard
            title="Products"
            icon="cube-outline"
            headerColor="#F59E0B"
            isDark={isDark}
          >
            <ProductRow
              label="Concrete"
              code={order.concrete_product_code}
              name={order.concrete_product_name || order.concrete_product_text}
              quantity={order.quantity}
              slump={order.slump}
              notes={order.concrete_notes}
              isDark={isDark}
            />
            <ProductRow
              label="Admixture"
              code={order.admixture_product_code}
              name={order.admixture_product_name}
              notes={order.admixture_notes}
              isDark={isDark}
            />
            <ProductRow
              label="Other"
              code={order.other_product_code}
              name={order.other_product_name}
              notes={order.other_notes}
              isDark={isDark}
            />
            {/* Show a note if no products at all */}
            {!order.concrete_product_code &&
              !order.concrete_product_name &&
              !order.concrete_product_text &&
              !order.admixture_product_code &&
              !order.admixture_product_name &&
              !order.other_product_code &&
              !order.other_product_name && (
                <Text variant="bodySmall" color="hint" style={{ textAlign: 'center', paddingVertical: ms(12) }}>
                  No product information provided.
                </Text>
              )}
          </SectionCard>

          {/* ========== ORDER SUMMARY ========== */}
          <SectionCard
            title="Order Summary"
            icon="text-box-outline"
            headerColor="#6366F1"
            isDark={isDark}
          >
            <InfoRow label="Request #" value={orderCode} isDark={isDark} />
            <InfoRow
              label="Order Status"
              value={
                order.order_status !== null && order.order_status !== undefined
                  ? ORDER_STATUS_LABELS[order.order_status] || '-'
                  : '-'
              }
              isDark={isDark}
            />
            <InfoRow
              label="Scheduled"
              value={
                `${formatDate(order.on_job_date)} ${order.on_job_time ? formatTime(order.on_job_time) : ''}`.trim() || '-'
              }
              isDark={isDark}
            />
            <InfoRow label="Job" value={order.job_name} isDark={isDark} />
            <InfoRow
              label="Address"
              value={
                [order.job_address, order.job_city, order.job_state, order.job_zip_code]
                  .filter(Boolean)
                  .join(', ') || '-'
              }
              isDark={isDark}
            />
            <InfoRow
              label="Spacing"
              value={
                order.truck_spacing
                  ? `${order.truck_spacing} min (${truckRate})`
                  : '-'
              }
              isDark={isDark}
            />
            {order.driver_instructions ? (
              <InfoRow label="Driver Instructions" value={order.driver_instructions} isDark={isDark} />
            ) : null}
          </SectionCard>

          {/* ========== STATUS BANNER ========== */}
          {status === 'approved' && (
            <View style={[styles.statusBanner, { backgroundColor: colors.success.main + '15', borderColor: colors.success.main }]}>
              <Icon name="check-circle" size={ms(20)} color={colors.success.main} />
              <Text variant="body" style={{ color: colors.success.main, marginLeft: ms(8), fontWeight: '600', flex: 1 }}>
                This order request has been accepted
              </Text>
            </View>
          )}
          {status === 'rejected' && (
            <View style={[styles.statusBanner, { backgroundColor: colors.error.main + '15', borderColor: colors.error.main }]}>
              <Icon name="close-circle" size={ms(20)} color={colors.error.main} />
              <Text variant="body" style={{ color: colors.error.main, marginLeft: ms(8), fontWeight: '600', flex: 1 }}>
                This order request has been rejected
              </Text>
            </View>
          )}
          {status === 'canceled' && (
            <View style={[styles.statusBanner, { backgroundColor: colors.error.main + '15', borderColor: colors.error.main }]}>
              <Icon name="cancel" size={ms(20)} color={colors.error.main} />
              <Text variant="body" style={{ color: colors.error.main, marginLeft: ms(8), fontWeight: '600', flex: 1 }}>
                This order request has been canceled
              </Text>
            </View>
          )}

          {/* ========== CHAT SECTION ========== */}
          <View style={[styles.chatSection, { backgroundColor: cardBg }]}>
            <View style={styles.chatHeader}>
              <Icon name="message-text-outline" size={ms(20)} color={colors.primary.main} />
              <Text variant="bodySmall" style={{ color: textColor, fontWeight: '700', marginLeft: ms(8) }}>
                Messages
              </Text>
              <Text variant="captionSmall" style={{ color: secondaryTextColor, marginLeft: ms(6) }}>
                ({messages.length})
              </Text>
            </View>

            {/* Messages list */}
            <View
              style={[
                styles.chatMessagesContainer,
                { backgroundColor: isDark ? colors.chat.dark.messageArea : colors.chat.light.messageArea },
              ]}
            >
              {messagesLoading ? (
                <View style={styles.chatLoading}>
                  <ActivityIndicator size="small" color={colors.primary.main} />
                </View>
              ) : processedMessages.length === 0 ? (
                <View style={styles.chatEmpty}>
                  <Icon name="message-outline" size={ms(32)} color={secondaryTextColor} />
                  <Text variant="bodySmall" color="hint" style={{ marginTop: ms(8), textAlign: 'center' }}>
                    No messages yet. Start the conversation!
                  </Text>
                </View>
              ) : (
                processedMessages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender_id === user?.id}
                    showDateSeparator={msg.showDateSeparator}
                    dateSeparatorText={msg.dateSeparatorText}
                    isDark={isDark}
                  />
                ))
              )}
            </View>

            {/* Message input */}
            <View style={[styles.chatInputRow, { borderTopColor: borderColor }]}>
              <TextInput
                style={[
                  styles.chatInput,
                  {
                    backgroundColor: isDark ? colors.chat.dark.inputBg : colors.chat.light.inputBg,
                    color: textColor,
                  },
                ]}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type a message..."
                placeholderTextColor={isDark ? colors.dark.text.hint : colors.light.text.hint}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: messageText.trim()
                      ? colors.primary.main
                      : isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.06)',
                  },
                ]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                activeOpacity={0.7}
              >
                {sendMessageMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Icon
                    name="send"
                    size={ms(20)}
                    color={messageText.trim() ? '#FFF' : secondaryTextColor}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

// ===========================================================================
// Styles
// ===========================================================================

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  // Header Card
  headerCard: {
    borderRadius: ms(12),
    padding: ms(16),
    marginBottom: ms(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(5),
    borderRadius: ms(16),
    borderWidth: 1,
  },

  // Action Section
  actionSection: {
    borderRadius: ms(12),
    padding: ms(16),
    marginBottom: ms(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: ms(10),
    marginBottom: ms(16),
  },
  actionBtn: {
    flex: 1,
    height: ms(42),
    borderRadius: ms(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    marginLeft: ms(6),
  },

  // Verification
  verificationSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
    paddingTop: ms(14),
  },
  verificationRow: {
    flexDirection: 'row',
    zIndex: 10,
  },
  verificationField: {},
  textInput: {
    height: ms(40),
    borderRadius: ms(8),
    borderWidth: 1,
    paddingHorizontal: ms(10),
    fontSize: ms(14),
  },

  // Stats Grid
  statsGrid: {
    marginBottom: ms(16),
  },
  statsRow: {
    flexDirection: 'row',
  },

  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(14),
    borderRadius: ms(12),
    borderWidth: 1,
    marginBottom: ms(16),
  },

  // Chat Section
  chatSection: {
    borderRadius: ms(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: ms(16),
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(14),
    paddingVertical: ms(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  chatMessagesContainer: {
    minHeight: ms(120),
    maxHeight: ms(350),
    paddingVertical: ms(8),
  },
  chatLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: ms(100),
  },
  chatEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: ms(24),
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: ms(10),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chatInput: {
    flex: 1,
    minHeight: ms(40),
    maxHeight: ms(100),
    borderRadius: ms(20),
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    fontSize: ms(14),
    marginRight: ms(8),
  },
  sendButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OrderRequestDetailScreen;
