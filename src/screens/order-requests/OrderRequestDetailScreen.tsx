import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  FlatList,
  ActivityIndicator,
  Modal,
  Keyboard,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CalendarPickerModal from '../../components/common/CalendarPickerModal';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
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
import { supabaseAdmin } from '../../services/supabase/supabaseClient';
import { RootStackParamList } from '../../navigation/types';
import { getUserPermissions, getSenderRole } from '../../utils/permissions';

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

const ORDER_STATUS_LABEL_KEYS: Record<number, string> = {
  0: 'orderRequests.create.orderStatus.normal',
  1: 'orderRequests.create.orderStatus.willCall',
  2: 'orderRequests.create.orderStatus.weatherPermitting',
  3: 'orderRequests.create.orderStatus.hold',
  4: 'orderRequests.create.orderStatus.completed',
  5: 'orderRequests.create.orderStatus.waitList',
};

const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABELS).map(([value]) => ({
  value: Number(value),
  labelKey: ORDER_STATUS_LABEL_KEYS[Number(value)] ?? '',
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
const getPartsInTimezone = (d: Date): { month: string; day: string; year: string; hours: string; minutes: string; period: string; tzAbbr: string } => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
  const parts = formatter.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return {
    month: get('month'),
    day: get('day'),
    year: get('year'),
    hours: get('hour'),
    minutes: get('minute').padStart(2, '0'),
    period: get('dayPeriod'),
    tzAbbr: get('timeZoneName'),
  };
};

// Format a date string — uses timezone conversion to match web behavior
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const p = getPartsInTimezone(d);
    return `${p.month}/${p.day}/${p.year}`;
  } catch {
    return dateStr;
  }
};

// Format a YYYY-MM-DD date-only string without timezone conversion
// Used for verification date fields to match web's native <input type="date"> display
const formatDateLocal = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  return formatDate(dateStr);
};

// Format a time string like "14:30:00" with timezone abbreviation in 12-hour format
const formatTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '-';
  try {
    if (/^\d{2}:\d{2}/.test(timeStr)) {
      const [h, m] = timeStr.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      // Use a reference date to get the timezone abbreviation
      const ref = new Date();
      const p = getPartsInTimezone(ref);
      return `${h12}:${String(m).padStart(2, '0')} ${period} ${p.tzAbbr}`;
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
    return `${p.month}/${p.day}/${p.year} ${p.hours}:${p.minutes} ${p.period} ${p.tzAbbr}`;
  } catch {
    return dateStr;
  }
};



const formatDateSeparator = (dateStr: string): string => {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const messageDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (messageDate.getTime() === today.getTime()) return i18n.t('chat.today');
  if (messageDate.getTime() === yesterday.getTime()) return i18n.t('chat.yesterday');
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
    borderBottomColor: colors.orderRequestDetail.sectionHeader.borderColor,
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
    shadowColor: colors.common.shadow,
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
    shadowColor: colors.common.shadow,
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
    color: colors.common.white,
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
  const borderColor = isDark ? colors.orderRequestDetail.product.dark.borderColor : colors.orderRequestDetail.product.light.borderColor;

  const hasData = code || name;

  return (
    <View style={[productRowStyles.container, { borderBottomColor: borderColor }]}>
      <Text variant="bodySmall" style={[productRowStyles.label, { color: colors.primary.main }]}>
        {label}
      </Text>
      {hasData ? (
        <>
          <Text variant="bodySmall" style={{ color: textColor, fontWeight: '600' }} numberOfLines={2}>
            {code && name ? `${code} - ${name}` : name || code}
          </Text>
          <View style={productRowStyles.detailsRow}>
            {quantity != null && (
              <Text variant="caption" style={{ color: secondaryColor }}>
                {i18n.t('orderRequests.detail.quantityCy', { value: Number(quantity).toFixed(2) })}
              </Text>
            )}
            {slump ? (
              <Text variant="caption" style={{ color: secondaryColor }}>
                {i18n.t('orderRequests.detail.slumpIn', { value: slump })}
              </Text>
            ) : null}
          </View>
          {notes ? (
            <Text variant="caption" style={{ color: secondaryColor, marginTop: ms(4) }} numberOfLines={3}>
              <Text variant="caption" style={{ fontWeight: '600', color: textColor }}>{i18n.t('orderRequests.detail.note')}</Text> - {notes}
            </Text>
          ) : null}
        </>
      ) : (
        <Text variant="bodySmall" style={{ color: secondaryColor }}>{i18n.t('orderRequests.detail.notOrdered')}</Text>
      )}
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
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(12),
    marginTop: ms(6),
  },
});

// ---------------------------------------------------------------------------
// Message Bubble
// ---------------------------------------------------------------------------

const getRoleLabel = (role: string): string => {
  const map: Record<string, string> = {
    concrete_producer: i18n.t('orderRequests.detail.roles.producer'),
    contractor: i18n.t('orderRequests.detail.roles.contractor'),
    admin: i18n.t('orderRequests.detail.roles.admin'),
  };
  return map[role] || role;
};

// Format time from a full ISO timestamp — matches web's formatTimeOnly logic
// Extracts time directly from the ISO string (e.g. "2026-04-03T06:44:00+00:00" → "06:44")
const formatMessageTime = (dateStr: string): string => {
  try {
    let timePart = dateStr;
    if (dateStr.includes('T')) {
      timePart = dateStr.split('T')[1]?.split('+')[0]?.split('Z')[0]?.split('-')[0] || '';
    }
    if (!timePart || !timePart.includes(':')) return '';
    const [hoursStr, minutesStr] = timePart.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) return '';
    const h = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  } catch {
    return '';
  }
};

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
  const chatColors = colors.orderRequestDetail.chat;
  const chatLight = chatColors.light;
  const ownBubbleBg = chatColors.ownBubbleBg;
  const otherBubbleBg = isDark ? colors.dark.surface : chatLight.otherBubbleBg;
  const otherBorderColor = isDark ? colors.dark.border : chatLight.otherBorderColor;
  const senderNameColor = isOwn
    ? (isDark ? chatColors.dark.ownSenderName : chatLight.ownSenderName)
    : (isDark ? colors.dark.text.secondary : chatLight.otherSenderName);
  const roleColor = isDark ? colors.dark.text.hint : chatLight.roleLabel;
  const separatorLineColor = isDark ? colors.dark.border : chatLight.separatorLine;
  const separatorTextColor = isDark ? colors.dark.text.hint : chatLight.separatorText;

  return (
    <View style={{ marginBottom: ms(10) }}>
      {showDateSeparator && (
        <View style={chatBubbleStyles.dateSeparator}>
          <View style={[chatBubbleStyles.dateSeparatorLine, { backgroundColor: separatorLineColor }]} />
          <Text variant="captionSmall" style={{ color: separatorTextColor, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: ms(10), fontSize: ms(9) }}>
            {dateSeparatorText}
          </Text>
          <View style={[chatBubbleStyles.dateSeparatorLine, { backgroundColor: separatorLineColor }]} />
        </View>
      )}
      <View style={[chatBubbleStyles.bubbleRow, isOwn ? chatBubbleStyles.ownRow : chatBubbleStyles.otherRow]}>
        <View style={{ maxWidth: '75%' }}>
          {/* Sender name + role above bubble */}
          <View style={[chatBubbleStyles.senderRow, { justifyContent: isOwn ? 'flex-end' : 'flex-start' }]}>
            <Text variant="captionSmall" style={{ color: senderNameColor, fontWeight: '600', fontSize: ms(10) }}>
              {message.sender_name}
            </Text>
            <Text variant="captionSmall" style={{ color: roleColor, fontSize: ms(9), marginLeft: ms(4) }}>
              {getRoleLabel(message.sender_role)}
            </Text>
          </View>
          {/* Bubble */}
          <View
            style={[
              chatBubbleStyles.bubble,
              {
                backgroundColor: isOwn ? ownBubbleBg : otherBubbleBg,
                borderTopRightRadius: isOwn ? ms(3) : ms(14),
                borderTopLeftRadius: isOwn ? ms(14) : ms(3),
                borderColor: isOwn ? colors.common.transparent : otherBorderColor,
                borderWidth: isOwn ? 0 : 1,
              },
            ]}
          >
            <Text variant="bodySmall" style={{ color: isOwn ? colors.common.white : (isDark ? colors.dark.text.primary : chatLight.otherMessageText) }}>
              {message.message_text}
            </Text>
            <Text variant="captionSmall" style={[chatBubbleStyles.timestamp, { color: isOwn ? chatColors.ownTimeText : (isDark ? colors.dark.text.hint : chatLight.otherTimeText) }]}>
              {formatMessageTime(message.created_at)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const chatBubbleStyles = StyleSheet.create({
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: ms(8),
    paddingHorizontal: ms(12),
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
  },
  bubbleRow: {
    paddingHorizontal: ms(12),
  },
  ownRow: {
    alignItems: 'flex-end',
  },
  otherRow: {
    alignItems: 'flex-start',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(4),
    marginBottom: ms(2),
  },
  bubble: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderBottomLeftRadius: ms(14),
    borderBottomRightRadius: ms(14),
  },
  timestamp: {
    alignSelf: 'flex-end',
    marginTop: ms(4),
    fontSize: ms(9),
  },
});

// ---------------------------------------------------------------------------
// Confirmation Modal
// ---------------------------------------------------------------------------

interface ConfirmModalState {
  visible: boolean;
  type: 'accept' | 'reject' | 'success' | 'error' | 'none';
  title: string;
  message: string;
  isLoading?: boolean;
}

const CONFIRM_INITIAL: ConfirmModalState = { visible: false, type: 'none', title: '', message: '' };

interface ConfirmationModalProps {
  state: ConfirmModalState;
  onConfirm: () => void;
  onClose: () => void;
  isDark: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ state, onConfirm, onClose, isDark }) => {
  const cardBg = isDark ? colors.dark.card : colors.orderRequestDetail.confirmModal.light.cardBg;
  const textColor = isDark ? colors.dark.text.primary : colors.light.text.primary;
  const secondaryColor = isDark ? colors.dark.text.secondary : colors.light.text.secondary;
  const isInfo = state.type === 'success' || state.type === 'error';

  const iconName = state.type === 'accept' ? 'check-circle-outline'
    : state.type === 'reject' ? 'close-circle-outline'
    : state.type === 'success' ? 'check-circle'
    : state.type === 'error' ? 'alert-circle'
    : 'information';

  const accentColor = state.type === 'accept' ? colors.success.main
    : state.type === 'reject' ? colors.error.main
    : state.type === 'success' ? colors.success.main
    : colors.error.main;

  return (
    <Modal visible={state.visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={confirmStyles.overlay}>
        <View style={[confirmStyles.card, { backgroundColor: cardBg }]}>
          {/* Close icon — top right */}
          <TouchableOpacity
            style={confirmStyles.closeIcon}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="close" size={ms(20)} color={secondaryColor} />
          </TouchableOpacity>
          <View style={[confirmStyles.iconCircle, { backgroundColor: accentColor + '15' }]}>
            <Icon name={iconName} size={ms(32)} color={accentColor} />
          </View>
          <Text variant="h3" style={[confirmStyles.title, { color: textColor }]}>{state.title}</Text>
          <Text variant="bodySmall" style={[confirmStyles.message, { color: secondaryColor }]}>{state.message}</Text>

          {isInfo ? (
            <TouchableOpacity
              style={[confirmStyles.btn, { backgroundColor: accentColor }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text variant="buttonSmall" style={{ color: colors.common.white, fontWeight: '700' }}>{i18n.t('orderRequests.detail.ok')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={confirmStyles.btnRow}>
              <TouchableOpacity
                style={[confirmStyles.btn, confirmStyles.cancelBtn, { borderColor: isDark ? colors.dark.border : colors.orderRequestDetail.confirmModal.light.cancelBorder }]}
                onPress={onClose}
                activeOpacity={0.7}
                disabled={state.isLoading}
              >
                <Text variant="buttonSmall" style={{ color: secondaryColor, fontWeight: '600' }}>{i18n.t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[confirmStyles.btn, { backgroundColor: accentColor, flex: 1 }]}
                onPress={onConfirm}
                activeOpacity={0.7}
                disabled={state.isLoading}
              >
                {state.isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text variant="buttonSmall" style={{ color: colors.common.white, fontWeight: '700' }}>
                    {state.type === 'accept' ? i18n.t('orderRequests.detail.accept') : i18n.t('orderRequests.detail.reject')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const confirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ms(24),
  },
  closeIcon: {
    position: 'absolute',
    top: ms(12),
    right: ms(12),
    zIndex: 1,
  },
  card: {
    width: '100%',
    maxWidth: ms(340),
    borderRadius: ms(16),
    padding: ms(24),
    alignItems: 'center',
    shadowColor: colors.common.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconCircle: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ms(16),
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: ms(8),
  },
  message: {
    textAlign: 'center',
    lineHeight: ms(20),
    marginBottom: ms(20),
  },
  btnRow: {
    flexDirection: 'row',
    gap: ms(10),
    width: '100%',
  },
  btn: {
    flex: 1,
    height: ms(44),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
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
  const inputBg = isDark ? colors.orderRequestDetail.input.dark.bg : colors.orderRequestDetail.input.light.bg;
  const inputBorder = isDark ? colors.orderRequestDetail.input.dark.border : colors.orderRequestDetail.input.light.border;
  const textColor = isDark ? colors.dark.text.primary : colors.light.text.primary;
  const modalBg = isDark ? colors.dark.surface : colors.light.surface;
  const modalBorder = isDark ? colors.dark.border : colors.light.border;

  const selectedLabel = value !== null && value !== undefined && ORDER_STATUS_LABEL_KEYS[value]
    ? i18n.t(ORDER_STATUS_LABEL_KEYS[value])
    : i18n.t('orderRequests.detail.select');

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
              <Text variant="h3" style={{ flex: 1 }}>{i18n.t('orderRequests.detail.selectOrderStatus')}</Text>
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
                    {opt.labelKey ? i18n.t(opt.labelKey) : ''}
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
    backgroundColor: colors.overlay.medium,
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
  const { t } = useTranslation();

  const { orderRequestId } = route.params;

  // Data hooks
  const { order, isLoading, isFetching, isError, refetch } = useOrderRequestDetail(orderRequestId);
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
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(CONFIRM_INITIAL);
  const [creatorName, setCreatorName] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Fetch creator name
  React.useEffect(() => {
    if (order?.user_id) {
      supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', order.user_id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) setCreatorName(data.full_name);
        });
    }
  }, [order?.user_id]);

  // Theme
  const bgColor = isDark ? colors.dark.background : colors.light.background;
  const cardBg = isDark ? colors.dark.card : colors.light.card;
  const surfaceBg = isDark ? colors.dark.surface : colors.light.surface;
  const textColor = isDark ? colors.dark.text.primary : colors.light.text.primary;
  const secondaryTextColor = isDark ? colors.dark.text.secondary : colors.light.text.secondary;
  const borderColor = isDark ? colors.dark.border : colors.light.border;
  const inputBg = isDark ? colors.orderRequestDetail.input.dark.bg : colors.orderRequestDetail.input.light.bg;
  const inputBorder = isDark ? colors.orderRequestDetail.input.dark.border : colors.orderRequestDetail.input.light.border;

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

  // Accept: show confirmation modal first
  const handleAcceptPress = useCallback(() => {
    if (!order) return;
    if (!orderNumber.trim()) {
      setConfirmModal({ visible: true, type: 'error', title: t('orderRequests.detail.validationError'), message: t('orderRequests.detail.orderNumberRequired') });
      return;
    }
    setConfirmModal({
      visible: true,
      type: 'accept',
      title: t('orderRequests.detail.acceptTitle'),
      message: t('orderRequests.detail.acceptMessage'),
    });
  }, [order, orderNumber]);

  const handleAcceptConfirm = useCallback(async () => {
    if (!order) return;
    setConfirmModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await orderRequestService.updateVerification(order.id, {
        order_number: orderNumber.trim(),
        order_status: selectedOrderStatus,
        on_job_date: verificationDate || undefined,
        on_job_time: verificationTime || undefined,
      });
      await updateStatusMutation.mutateAsync({ id: order.id, status: 'approved' });
      setConfirmModal({ visible: true, type: 'success', title: t('orderRequests.detail.acceptedTitle'), message: t('orderRequests.detail.acceptedMessage') });
      setTimeout(() => {
        setConfirmModal(CONFIRM_INITIAL);
        navigation.goBack();
      }, 3000);
    } catch (err: any) {
      setConfirmModal({ visible: true, type: 'error', title: t('common.error'), message: err?.message || t('orderRequests.detail.acceptFailed') });
    }
  }, [order, orderNumber, selectedOrderStatus, verificationDate, verificationTime, updateStatusMutation]);

  // Reject: show confirmation modal first
  const handleRejectPress = useCallback(() => {
    if (!order) return;
    setConfirmModal({
      visible: true,
      type: 'reject',
      title: t('orderRequests.detail.rejectTitle'),
      message: t('orderRequests.detail.rejectMessage'),
    });
  }, [order]);

  const handleRejectConfirm = useCallback(async () => {
    if (!order) return;
    setConfirmModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await updateStatusMutation.mutateAsync({ id: order.id, status: 'rejected' });
      setConfirmModal({ visible: true, type: 'success', title: t('orderRequests.detail.rejectedTitle'), message: t('orderRequests.detail.rejectedMessage') });
      setTimeout(() => {
        setConfirmModal(CONFIRM_INITIAL);
        navigation.goBack();
      }, 2000);
    } catch (err: any) {
      setConfirmModal({ visible: true, type: 'error', title: t('common.error'), message: err?.message || t('orderRequests.detail.rejectFailed') });
    }
  }, [order, updateStatusMutation]);

  const handleConfirmModalAction = useCallback(() => {
    if (confirmModal.type === 'accept') handleAcceptConfirm();
    else if (confirmModal.type === 'reject') handleRejectConfirm();
  }, [confirmModal.type, handleAcceptConfirm, handleRejectConfirm]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !order) return;
    // Map user role to valid sender_role matching web and DB constraint
    // DB CHECK: sender_role IN ('concrete_producer', 'contractor', 'admin')
    const senderRole = getSenderRole(user);
    try {
      await sendMessageMutation.mutateAsync({
        id: order.id,
        messageText: messageText.trim(),
        senderRole,
      });
      setMessageText('');
    } catch (err: any) {
      setConfirmModal({ visible: true, type: 'error', title: t('common.error'), message: err?.message || t('orderRequests.detail.sendMessageFailed') });
    }
  }, [messageText, order, user, sendMessageMutation, t]);

  // ----- Loading / Error States -----

  if (isLoading) {
    return (
      <ScreenContainer edges={[]} usePlainView={false}>
        <ScreenHeader title={t('orderRequests.detail.title')} showBackButton />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text variant="body" color="secondary" style={{ marginTop: ms(12) }}>
            {t('orderRequests.detail.loading')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !order) {
    return (
      <ScreenContainer edges={[]} usePlainView={false}>
        <ScreenHeader title={t('orderRequests.detail.title')} showBackButton />
        <View style={styles.centered}>
          <Icon name="alert-circle-outline" size={ms(48)} color={colors.error.main} />
          <Text variant="body" color="secondary" style={{ marginTop: ms(12) }}>
            {t('orderRequests.detail.failedToLoad')}
          </Text>
          <Button title={t('common.retry')} variant="primary" onPress={() => refetch()} style={{ marginTop: ms(16) }} />
        </View>
      </ScreenContainer>
    );
  }

  // ----- Derived Data -----

  const status = order.status;
  const statusColor = STATUS_COLORS[status] || colors.grey[50];
  const isPendingOrSubmitted = status === 'pending' || status === 'submitted';
  // Same as web: canManageOrders (order-request/[id]/page.tsx line 134)
  const { canManageOrders } = getUserPermissions(user);
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
    <ScreenContainer edges={[]} usePlainView={false}>
      <ScreenHeader title={t('orderRequests.detail.title')} showBackButton showRefreshButton isRefreshing={isFetching && !isLoading} onRefresh={() => { refetch(); refetchMessages(); }} />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + ms(24) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={ms(80)}
      >
          {/* ========== HEADER INFO ========== */}
          <View style={[styles.headerCard, { backgroundColor: cardBg }]}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text variant="h3" style={{ color: textColor, fontWeight: '700' }}>
                  {orderCode}
                </Text>
                <Text variant="caption" style={{ color: secondaryTextColor, marginTop: ms(2) }}>
                  {t('orderRequests.detail.createdPrefix', { date: formatDateTime(order.created_at) })}
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
                  {(() => {
                    const map: Record<string, string> = {
                      pending: t('orderRequests.list.status.pending'),
                      submitted: t('orderRequests.list.status.submitted'),
                      approved: t('orderRequests.list.status.accepted'),
                      rejected: t('orderRequests.list.status.rejected'),
                      canceled: t('orderRequests.list.status.canceled'),
                    };
                    return map[status] ?? status;
                  })()}
                </Text>
              </View>
            </View>
          </View>

          {/* ========== ACCEPT / REJECT / UPDATE SECTION ========== */}
          {/* Same as web: canManageOrders && (status === "pending" || status === "submitted") */}
          {canManageOrders && isPendingOrSubmitted && (
            <View style={[styles.actionSection, { backgroundColor: cardBg }]}>
              {/* Action Buttons — web shows all 3 together */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.success.main },
                  ]}
                  onPress={handleAcceptPress}
                  disabled={isAccepting}
                  activeOpacity={0.7}
                >
                  {isAccepting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Icon name="check-circle" size={ms(18)} color="#FFF" />
                      <Text variant="buttonSmall" style={styles.actionBtnText}>{t('orderRequests.detail.accept')}</Text>
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
                  onPress={handleRejectPress}
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
                        {t('orderRequests.detail.reject')}
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
                  <Text variant="buttonSmall" style={styles.actionBtnText}>{t('orderRequests.detail.update')}</Text>
                </TouchableOpacity>
              </View>

              {/* Verification Fields — web shows these with the action section */}
              <View style={styles.verificationSection}>
                <Text variant="bodySmall" style={{ color: secondaryTextColor, fontWeight: '600', marginBottom: ms(10) }}>
                  {t('orderRequests.detail.verificationDetails')}
                </Text>

                {/* Row 1: Order Number + Order Status */}
                <View style={styles.verificationRow}>
                  <View style={[styles.verificationField, { flex: 1, marginRight: ms(8) }]}>
                    <Text variant="captionSmall" style={{ color: secondaryTextColor, marginBottom: ms(4) }}>
                      {t('orderRequests.detail.orderNumberLabel')}
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
                      placeholder={t('orderRequests.detail.enterOrderNumber')}
                      placeholderTextColor={isDark ? colors.dark.text.hint : colors.light.text.hint}
                    />
                  </View>
                  <View style={[styles.verificationField, { flex: 1 }]}>
                    <Text variant="captionSmall" style={{ color: secondaryTextColor, marginBottom: ms(4) }}>
                      {t('orderRequests.detail.verifyOrderStatus')}
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
                      {t('orderRequests.detail.verifyOrderDate')}
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
                        {verificationDate ? formatDateLocal(verificationDate) : t('orderRequests.detail.selectDate')}
                      </Text>
                      <Icon name="calendar" size={ms(16)} color={secondaryTextColor} />
                    </TouchableOpacity>
                    <CalendarPickerModal
                      visible={showVerifyDatePicker}
                      selectedDate={verificationDate}
                      onSelect={(date) => setVerificationDate(date)}
                      onClose={() => setShowVerifyDatePicker(false)}
                      isDark={isDark}
                      title={t('orderRequests.detail.verifyOrderDate')}
                    />
                  </View>
                  <View style={[styles.verificationField, { flex: 1 }]}>
                    <Text variant="captionSmall" style={{ color: secondaryTextColor, marginBottom: ms(4) }}>
                      {t('orderRequests.detail.verifyArrivalTime')}
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
                        {verificationTime ? (() => { const [h, m] = verificationTime.split(':').map(Number); const period = h >= 12 ? 'PM' : 'AM'; const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h; return `${h12}:${String(m).padStart(2, '0')} ${period}`; })() : t('orderRequests.detail.selectTime')}
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
                label={t('orderRequests.detail.orderStatus')}
                value={
                  order.order_status !== null && order.order_status !== undefined && ORDER_STATUS_LABEL_KEYS[order.order_status]
                    ? t(ORDER_STATUS_LABEL_KEYS[order.order_status])
                    : '-'
                }
                bgColor="#7C3AED"
                isDark={isDark}
              />
              <View style={{ width: ms(12) }} />
              <QuickStatCard
                icon="calendar-month-outline"
                label={t('orderRequests.detail.onJobDate')}
                value={formatDate(order.on_job_date)}
                sub={order.on_job_time ? formatTime(order.on_job_time) : undefined}
                bgColor="#0EA5E9"
                isDark={isDark}
              />
            </View>
            <View style={[styles.statsRow, { marginTop: ms(12) }]}>
              <QuickStatCard
                icon="truck-outline"
                label={t('orderRequests.detail.truckRate')}
                value={truckRate}
                sub={order.truck_spacing ? t('orderRequests.detail.minSpacing', { value: order.truck_spacing }) : undefined}
                bgColor="#14B8A6"
                isDark={isDark}
              />
              <View style={{ width: ms(12) }} />
              <QuickStatCard
                icon="package-variant"
                label={t('orderRequests.detail.quantity')}
                value={order.quantity ? t('orderRequests.detail.quantityCy', { value: Number(order.quantity).toFixed(2) }) : t('orderRequests.detail.quantityCy', { value: '0.00' })}
                bgColor="#F59E0B"
                isDark={isDark}
              />
            </View>
          </View>

          {/* ========== JOB DETAILS ========== */}
          <SectionCard
            title={t('orderRequests.detail.sections.jobDetails')}
            icon="briefcase-outline"
            headerColor={colors.secondary.main}
            isDark={isDark}
          >
            <InfoRow label={t('orderRequests.detail.fields.company')} value={order.company_name} isDark={isDark} />
            <InfoRow label={t('orderRequests.detail.fields.jobName')} value={order.job_name} isDark={isDark} />
            <InfoRow label={t('orderRequests.detail.fields.usage')} value={order.usage_name || order.usage_code} isDark={isDark} />
            <InfoRow label={t('orderRequests.detail.fields.poNumber')} value={order.po_number} isDark={isDark} />
          </SectionCard>

          {/* ========== JOB LOCATION ========== */}
          <SectionCard
            title={t('orderRequests.detail.sections.jobLocation')}
            icon="map-marker-outline"
            headerColor="#14B8A6"
            isDark={isDark}
          >
            <InfoRow label={t('orderRequests.detail.fields.address')} value={order.job_address} isDark={isDark} />
            <InfoRow
              label={t('orderRequests.detail.fields.cityStateZip')}
              value={
                [order.job_city, order.job_state, order.job_zip_code]
                  .filter(Boolean)
                  .join(', ') || '-'
              }
              isDark={isDark}
            />
            <InfoRow label={t('orderRequests.detail.fields.jobName')} value={order.job_name} isDark={isDark} />
          </SectionCard>

          {/* ========== JOBSITE CONTACT ========== */}
          <SectionCard
            title={t('orderRequests.detail.sections.jobsiteContact')}
            icon="account-outline"
            headerColor="#8B5CF6"
            isDark={isDark}
          >
            <InfoRow label={t('orderRequests.detail.fields.name')} value={order.job_contact_name} isDark={isDark} />
            <InfoRow label={t('orderRequests.detail.fields.phone')} value={order.job_contact_phone} isDark={isDark} />
          </SectionCard>

          {/* ========== PRODUCTS ========== */}
          <SectionCard
            title={t('orderRequests.detail.sections.products')}
            icon="cube-outline"
            headerColor="#F59E0B"
            isDark={isDark}
          >
            <ProductRow
              label={t('orderRequests.detail.products.concrete')}
              code={order.concrete_product_code}
              name={order.concrete_product_name}
              quantity={order.quantity}
              slump={order.slump}
              notes={order.concrete_notes}
              isDark={isDark}
            />
            <ProductRow
              label={t('orderRequests.detail.products.admixture')}
              code={order.admixture_product_code}
              name={order.admixture_product_name}
              notes={order.admixture_notes}
              isDark={isDark}
            />
            <ProductRow
              label={t('orderRequests.detail.products.other')}
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
                  {t('orderRequests.detail.noProductInfo')}
                </Text>
              )}
          </SectionCard>

          {/* ========== ORDER SUMMARY ========== */}
          <SectionCard
            title={t('orderRequests.detail.sections.orderSummary')}
            icon="text-box-outline"
            headerColor="#6366F1"
            isDark={isDark}
          >
            <View style={[styles.summaryAlert, isDark && styles.summaryAlertDark]}>
              <Text variant="bodySmall" style={{ color: isDark ? colors.orderRequestDetail.summaryAlert.dark.text : colors.orderRequestDetail.summaryAlert.light.text }}>
                <Text variant="bodySmall" style={{ fontWeight: '700', color: isDark ? colors.orderRequestDetail.summaryAlert.dark.textBold : colors.orderRequestDetail.summaryAlert.light.textBold }}>{creatorName || t('orderRequests.detail.user')}</Text>
                {' '}{t('orderRequests.detail.placedOrderRequestFor')}{' '}
                <Text variant="bodySmall" style={{ fontWeight: '700', color: isDark ? colors.orderRequestDetail.summaryAlert.dark.textBold : colors.orderRequestDetail.summaryAlert.light.textBold }}>{order.company_name || '—'}</Text>
              </Text>
            </View>
            <InfoRow label={t('orderRequests.detail.fields.requestNumber')} value={orderCode} isDark={isDark} />
            <InfoRow
              label={t('orderRequests.detail.orderStatus')}
              value={
                order.order_status !== null && order.order_status !== undefined && ORDER_STATUS_LABEL_KEYS[order.order_status]
                  ? t(ORDER_STATUS_LABEL_KEYS[order.order_status])
                  : '-'
              }
              isDark={isDark}
            />
            <InfoRow
              label={t('orderRequests.detail.fields.scheduled')}
              value={
                `${formatDate(order.on_job_date)} ${order.on_job_time ? formatTime(order.on_job_time) : ''}`.trim() || '-'
              }
              isDark={isDark}
            />
            <InfoRow label={t('orderRequests.detail.fields.job')} value={order.job_name} isDark={isDark} />
            <InfoRow
              label={t('orderRequests.detail.fields.address')}
              value={
                [order.job_address, order.job_city, order.job_state, order.job_zip_code]
                  .filter(Boolean)
                  .join(', ') || '-'
              }
              isDark={isDark}
            />
            <InfoRow
              label={t('orderRequests.detail.fields.spacing')}
              value={
                order.truck_spacing
                  ? t('orderRequests.detail.spacingValue', { min: order.truck_spacing, rate: truckRate })
                  : '-'
              }
              isDark={isDark}
            />
            {order.driver_instructions ? (
              <InfoRow label={t('orderRequests.detail.fields.driverInstructions')} value={order.driver_instructions} isDark={isDark} />
            ) : null}
          </SectionCard>

          {/* ========== STATUS BANNER ========== */}
          {status === 'approved' && (
            <View style={[styles.statusBanner, { backgroundColor: colors.success.main + '15', borderColor: colors.success.main }]}>
              <Icon name="check-circle" size={ms(20)} color={colors.success.main} />
              <Text variant="body" style={{ color: colors.success.main, marginLeft: ms(8), fontWeight: '600', flex: 1 }}>
                {t('orderRequests.detail.banners.accepted')}
              </Text>
            </View>
          )}
          {status === 'rejected' && (
            <View style={[styles.statusBanner, { backgroundColor: colors.error.main + '15', borderColor: colors.error.main }]}>
              <Icon name="close-circle" size={ms(20)} color={colors.error.main} />
              <Text variant="body" style={{ color: colors.error.main, marginLeft: ms(8), fontWeight: '600', flex: 1 }}>
                {t('orderRequests.detail.banners.rejected')}
              </Text>
            </View>
          )}
          {status === 'canceled' && (
            <View style={[styles.statusBanner, { backgroundColor: colors.error.main + '15', borderColor: colors.error.main }]}>
              <Icon name="cancel" size={ms(20)} color={colors.error.main} />
              <Text variant="body" style={{ color: colors.error.main, marginLeft: ms(8), fontWeight: '600', flex: 1 }}>
                {t('orderRequests.detail.banners.canceled')}
              </Text>
            </View>
          )}

          {/* ========== CHAT SECTION ========== */}
          <View style={[styles.chatSection, { backgroundColor: cardBg }]}>
            <View style={styles.chatHeader}>
              <Icon name="message-text-outline" size={ms(20)} color={colors.primary.main} />
              <Text variant="bodySmall" style={{ color: textColor, fontWeight: '700', marginLeft: ms(8) }}>
                {t('orderRequests.detail.messages')}
              </Text>
              <Text variant="captionSmall" style={{ color: secondaryTextColor, marginLeft: ms(6) }}>
                ({messages.length})
              </Text>
            </View>

            {/* Messages list */}
            <ScrollView
              style={[
                styles.chatMessagesContainer,
                { backgroundColor: isDark ? colors.chat.dark.messageArea : colors.chat.light.messageArea },
              ]}
              contentContainerStyle={{ paddingVertical: ms(8) }}
              nestedScrollEnabled
            >
              {messagesLoading ? (
                <View style={styles.chatLoading}>
                  <ActivityIndicator size="small" color={colors.primary.main} />
                </View>
              ) : processedMessages.length === 0 ? (
                <View style={styles.chatEmpty}>
                  <Icon name="message-outline" size={ms(32)} color={secondaryTextColor} />
                  <Text variant="bodySmall" color="hint" style={{ marginTop: ms(8), textAlign: 'center' }}>
                    {t('orderRequests.detail.noMessages')}
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
            </ScrollView>

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
                placeholder={t('chat.messagePlaceholder')}
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
                      ? colors.orderRequestDetail.sendButton.dark.disabledBg
                      : colors.orderRequestDetail.sendButton.light.disabledBg,
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
                    color={messageText.trim() ? colors.common.white : secondaryTextColor}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
      </KeyboardAwareScrollView>

      <ConfirmationModal
        state={confirmModal}
        onConfirm={handleConfirmModalAction}
        onClose={() => {
          const wasSuccess = confirmModal.type === 'success';
          setConfirmModal(CONFIRM_INITIAL);
          if (wasSuccess) {
            navigation.goBack();
          }
        }}
        isDark={isDark}
      />
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
    shadowColor: colors.common.shadow,
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
    shadowColor: colors.common.shadow,
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
    color: colors.common.white,
    fontWeight: '700',
    marginLeft: ms(6),
  },

  // Verification
  verificationSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.orderRequestDetail.sectionHeader.borderColor,
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
  summaryAlert: {
    backgroundColor: colors.orderRequestDetail.summaryAlert.light.bg,
    borderColor: colors.orderRequestDetail.summaryAlert.light.border,
    borderWidth: 1,
    borderRadius: ms(10),
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    marginBottom: ms(10),
  },
  summaryAlertDark: {
    backgroundColor: colors.orderRequestDetail.summaryAlert.dark.bg,
    borderColor: colors.orderRequestDetail.summaryAlert.dark.border,
  },

  // Chat Section
  chatSection: {
    borderRadius: ms(12),
    overflow: 'hidden',
    shadowColor: colors.common.shadow,
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
    borderBottomColor: colors.orderRequestDetail.sectionHeader.borderColor,
  },
  chatMessagesContainer: {
    minHeight: ms(120),
    maxHeight: ms(380),
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
