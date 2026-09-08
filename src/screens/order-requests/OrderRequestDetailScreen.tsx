import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTimezoneStore } from '../../store/timezoneStore';
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
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, ScreenContainer, ScreenHeader, Button } from '../../components/common';
import { colors } from '../../theme/colors';
import { getVolumeUnit } from '../../utils/units';
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
import apiClient from '../../api/apiClient';
import { API_ENDPOINTS } from '../../api/endpoints';
import { RootStackParamList } from '../../navigation/types';
import { getUserPermissions, getSenderRole } from '../../utils/permissions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderRequestDetailRouteProp = RouteProp<
  { OrderRequestDetail: { orderRequestId: string; scrollToMessages?: boolean } },
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

const getTimezone = () => useTimezoneStore.getState().timezone.iana_code;

// Get timezone-aware date/time parts from a Date object
const getPartsInTimezone = (d: Date): { month: string; day: string; year: string; hours: string; minutes: string; period: string; tzAbbr: string } => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: getTimezone(),
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

// Parse a time string into 24-hour { hours, minutes }.
// Handles both "14:30" / "14:30:00" (24hr) and "06:40 PM" (12hr with AM/PM).
const parseTimeParts = (timeStr: string): { hours: number; minutes: number } | null => {
  // 12-hour with AM/PM: "06:40 PM", "6:40 AM"
  const ampm = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const isPM = ampm[3].toUpperCase() === 'PM';
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return { hours: h, minutes: m };
  }
  // 24-hour: "14:30" or "14:30:00"
  const h24 = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (h24) {
    return { hours: parseInt(h24[1], 10), minutes: parseInt(h24[2], 10) };
  }
  return null;
};

// Format a clock-time string to "HH:MM AM/PM" display format.
// Handles both "14:30:00" (24hr) and "06:40 PM" (12hr with AM/PM).
const formatTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '-';
  try {
    const p = parseTimeParts(timeStr);
    if (!p) return timeStr;
    const period = p.hours >= 12 ? 'PM' : 'AM';
    const h12 = p.hours === 0 ? 12 : p.hours > 12 ? p.hours - 12 : p.hours;
    return `${h12}:${String(p.minutes).padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
};

// Format a full ISO timestamp like "2026-03-31T07:11:24+00:00" → "03/31/2026 02:11 PM"
// (12hr in user's selected timezone, no TZ chip).
const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    // If already pre-formatted by the API (e.g. "04/10/2026, 08:08 AM"), use as-is
    if (/^\d{1,2}\/\d{1,2}\/\d{4},?\s+\d{1,2}:\d{2}\s*(AM|PM)$/i.test(dateStr)) {
      return dateStr.replace(',', '');
    }
    const d = new Date(dateStr);
    const p = getPartsInTimezone(d);
    return `${p.month}/${p.day}/${p.year} ${p.hours}:${p.minutes} ${p.period}`;
  } catch {
    return dateStr;
  }
};



const formatDateSeparator = (
  dateStr: string,
  t: (key: string) => string,
): string => {
  const d = parseFlexibleDate(dateStr);
  if (!d) return dateStr;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const messageDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (messageDate.getTime() === today.getTime()) return t('chat.today');
  if (messageDate.getTime() === yesterday.getTime()) return t('chat.yesterday');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const isDifferentDay = (a: string, b: string): boolean => {
  const d1 = parseFlexibleDate(a);
  const d2 = parseFlexibleDate(b);
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  );
};

const computeTruckRate = (truckSpacing: number | null): string => {
  if (!truckSpacing || truckSpacing <= 0) return '-';
  return `${(60 / truckSpacing).toFixed(1)} ${getVolumeUnit()}/HR`;
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
        <Icon name={icon} size={ms(18)} color={colors.common.white} />
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
  const { t } = useTranslation();
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
                {Number(quantity).toFixed(2)} {getVolumeUnit()}
              </Text>
            )}
            {slump ? (
              <Text variant="caption" style={{ color: secondaryColor }}>
                {t('orderRequest.slump')}: {slump} IN
              </Text>
            ) : null}
          </View>
          {notes ? (
            <Text variant="caption" style={{ color: secondaryColor, marginTop: ms(4) }} numberOfLines={3}>
              <Text variant="caption" style={{ fontWeight: '600', color: textColor }}>{t('orderRequest.note')}</Text> - {notes}
            </Text>
          ) : null}
        </>
      ) : (
        <Text variant="bodySmall" style={{ color: secondaryColor }}>{t('orderRequest.notOrdered')}</Text>
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

const ROLE_LABELS: Record<string, string> = {
  concrete_producer: 'Producer',
  contractor: 'Contractor',
  admin: 'Admin',
};

// Parse a date string that may be ISO ("2026-04-03T06:44:00+00:00") or
// pre-formatted from the API ("05/07/2026, 04:31 AM").
const parseFlexibleDate = (dateStr: string): Date | null => {
  // Try ISO first
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }
  // Try pre-formatted: "MM/DD/YYYY, HH:MM AM/PM"
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) {
    let hours = parseInt(m[4], 10);
    const minutes = parseInt(m[5], 10);
    const isPM = m[6].toUpperCase() === 'PM';
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return new Date(parseInt(m[3], 10), parseInt(m[1], 10) - 1, parseInt(m[2], 10), hours, minutes);
  }
  // Fallback
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

// Format time from a date string — handles both ISO and pre-formatted API dates.
const formatMessageTime = (dateStr: string): string => {
  try {
    const d = parseFlexibleDate(dateStr);
    if (!d) return '';
    const hours = d.getHours();
    const minutes = d.getMinutes();
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

const ChatBubble: React.FC<ChatBubbleProps> = React.memo(({
  message,
  isOwn,
  showDateSeparator,
  dateSeparatorText,
  isDark,
}) => {
  const { t } = useTranslation();
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
      <View style={[chatBubbleStyles.bubbleRow, chatBubbleStyles.otherRow]}>
        <View style={{ maxWidth: '75%' }}>
          {/* Sender name + role above bubble */}
          <View style={[chatBubbleStyles.senderRow, { justifyContent: 'flex-start' }]}>
            <Text variant="captionSmall" style={{ color: senderNameColor, fontWeight: '600', fontSize: ms(10) }}>
              {message.sender_name}
            </Text>
            <Text variant="captionSmall" style={{ color: roleColor, fontSize: ms(9), marginLeft: ms(4) }}>
              {t(`orderRequest.roles.${message.sender_role}`, { defaultValue: ROLE_LABELS[message.sender_role] || message.sender_role })}
            </Text>
          </View>
          {/* Bubble */}
          <View
            style={[
              chatBubbleStyles.bubble,
              {
                backgroundColor: isOwn ? ownBubbleBg : otherBubbleBg,
                borderTopRightRadius: ms(14),
                borderTopLeftRadius: ms(3),
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
});

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
  const { t } = useTranslation();
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
              <Text variant="buttonSmall" style={{ color: colors.common.white, fontWeight: '700' }}>{t('common.ok')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={confirmStyles.btnRow}>
              <TouchableOpacity
                style={[confirmStyles.btn, confirmStyles.cancelBtn, { borderColor: isDark ? colors.dark.border : colors.orderRequestDetail.confirmModal.light.cancelBorder }]}
                onPress={onClose}
                activeOpacity={0.7}
                disabled={state.isLoading}
              >
                <Text variant="buttonSmall" style={{ color: secondaryColor, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[confirmStyles.btn, { backgroundColor: accentColor, flex: 1 }]}
                onPress={onConfirm}
                activeOpacity={0.7}
                disabled={state.isLoading}
              >
                {state.isLoading ? (
                  <ActivityIndicator size="small" color={colors.common.white} />
                ) : (
                  <Text variant="buttonSmall" style={{ color: colors.common.white, fontWeight: '700' }}>
                    {state.type === 'accept' ? t('orderRequest.accept') : t('orderRequest.reject')}
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
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const inputBg = isDark ? colors.orderRequestDetail.input.dark.bg : colors.orderRequestDetail.input.light.bg;
  const inputBorder = isDark ? colors.orderRequestDetail.input.dark.border : colors.orderRequestDetail.input.light.border;
  const textColor = isDark ? colors.dark.text.primary : colors.light.text.primary;
  const modalBg = isDark ? colors.dark.surface : colors.light.surface;
  const modalBorder = isDark ? colors.dark.border : colors.light.border;

  const selectedLabel = value !== null && value !== undefined
    ? ORDER_STATUS_LABELS[value] ?? t('orderRequest.select')
    : t('orderRequest.select');

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
              <Text variant="h3" style={{ flex: 1 }}>{t('orderRequest.selectOrderStatus')}</Text>
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
  const { t } = useTranslation();
  const route = useRoute<OrderRequestDetailRouteProp>();
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const { orderRequestId, scrollToMessages: shouldScrollToMessages } = route.params;

  // Refs for the auto-scroll-on-notification-tap behaviour.
  // pageScrollRef = outer KeyboardAwareScrollView (whole page).
  // messagesScrollRef = inner ScrollView containing the message bubbles.
  // chatSectionYRef = pixel offset of the chat section inside the page,
  // captured via onLayout so we can scroll the page to it precisely.
  const pageScrollRef = useRef<ScrollView | null>(null);
  const messagesScrollRef = useRef<ScrollView | null>(null);
  const chatSectionYRef = useRef<number>(0);
  const didScrollFromNotificationRef = useRef<boolean>(false);

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
  const [tempVerifyTime, setTempVerifyTime] = useState<Date>(new Date());
  const [messageText, setMessageText] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(CONFIRM_INITIAL);
  const [creatorName, setCreatorName] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Auto-scroll to the chat section + latest message when arrived via a
  // notification tap. Runs once after the order detail and messages have
  // both loaded so chatSectionYRef is set and the inner list has content.
  useEffect(() => {
    if (
      !shouldScrollToMessages ||
      didScrollFromNotificationRef.current ||
      isLoading ||
      messagesLoading
    ) {
      return;
    }
    didScrollFromNotificationRef.current = true;

    // Wait one tick for layout to settle (chatSectionYRef + inner content size).
    const timer = setTimeout(() => {
      const targetY = chatSectionYRef.current || 0;
      pageScrollRef.current?.scrollTo({ y: targetY, animated: true });
      messagesScrollRef.current?.scrollToEnd({ animated: false });
    }, 250);

    return () => clearTimeout(timer);
  }, [shouldScrollToMessages, isLoading, messagesLoading]);

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
      apiClient
        .get<{ success: boolean; data: { name: string } }>(`${API_ENDPOINTS.CHAT.USER}/${order.user_id}`)
        .then((res) => {
          if (res.success && res.data?.name) setCreatorName(res.data.name);
        })
        .catch(() => {});
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
      setConfirmModal({ visible: true, type: 'error', title: t('orderRequest.validationError'), message: t('orderRequest.orderNumberRequired') });
      return;
    }
    setConfirmModal({
      visible: true,
      type: 'accept',
      title: t('orderRequest.acceptTitle'),
      message: t('orderRequest.acceptConfirm'),
    });
  }, [order, orderNumber, t]);

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
      setConfirmModal({ visible: true, type: 'success', title: t('orderRequest.accepted'), message: t('orderRequest.acceptedSuccess') });
      setTimeout(() => {
        setConfirmModal(CONFIRM_INITIAL);
        navigation.goBack();
      }, 3000);
    } catch (err: any) {
      setConfirmModal({ visible: true, type: 'error', title: t('common.error'), message: err?.message || t('orderRequest.acceptFailed') });
    }
  }, [order, orderNumber, selectedOrderStatus, verificationDate, verificationTime, updateStatusMutation, t]);

  // Reject: show confirmation modal first
  const handleRejectPress = useCallback(() => {
    if (!order) return;
    setConfirmModal({
      visible: true,
      type: 'reject',
      title: t('orderRequest.rejectTitle'),
      message: t('orderRequest.rejectConfirm'),
    });
  }, [order, t]);

  const handleRejectConfirm = useCallback(async () => {
    if (!order) return;
    setConfirmModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await updateStatusMutation.mutateAsync({ id: order.id, status: 'rejected' });
      setConfirmModal({ visible: true, type: 'success', title: t('orderRequest.rejected'), message: t('orderRequest.rejectedSuccess') });
      setTimeout(() => {
        setConfirmModal(CONFIRM_INITIAL);
        navigation.goBack();
      }, 2000);
    } catch (err: any) {
      setConfirmModal({ visible: true, type: 'error', title: t('common.error'), message: err?.message || t('orderRequest.rejectFailed') });
    }
  }, [order, updateStatusMutation, t]);

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
      const senderName = user?.fullName
        || user?.metadata?.full_name
        || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
        || user?.email?.split('@')[0]
        || undefined;
      await sendMessageMutation.mutateAsync({
        id: order.id,
        messageText: messageText.trim(),
        senderRole,
        senderName,
      });
      setMessageText('');
    } catch (err: any) {
      setConfirmModal({ visible: true, type: 'error', title: t('common.error'), message: err?.message || t('orderRequest.sendMessageFailed') });
    }
  }, [messageText, order, user, sendMessageMutation, t]);

  // ----- Loading / Error States -----

  if (isLoading) {
    return (
      <ScreenContainer edges={[]} usePlainView={false}>
        <ScreenHeader title={t('orderRequest.title')} showBackButton />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text variant="body" color="secondary" style={{ marginTop: ms(12) }}>
            {t('orderRequest.loading')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !order) {
    return (
      <ScreenContainer edges={[]} usePlainView={false}>
        <ScreenHeader title={t('orderRequest.title')} showBackButton />
        <View style={styles.centered}>
          <Icon name="alert-circle-outline" size={ms(48)} color={colors.error.main} />
          <Text variant="body" color="secondary" style={{ marginTop: ms(12) }}>
            {t('orderRequest.loadFailed')}
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
      dateSeparatorText: showDateSep ? formatDateSeparator(msg.created_at, t) : '',
    };
  });

  // ----- Render -----

  return (
    <ScreenContainer edges={[]} usePlainView={false}>
      <ScreenHeader title={t('orderRequest.title')} showBackButton showRefreshButton isRefreshing={isFetching && !isLoading} onRefresh={() => { refetch(); refetchMessages(); }} />

      <KeyboardAwareScrollView
        ref={pageScrollRef as any}
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
                  {t('orderRequest.created')} {formatDateTime(order.created_at)}
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
                  {t(`orderRequest.statusDisplay.${status}`, { defaultValue: STATUS_DISPLAY_LABELS[status] ?? status })}
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
                    <ActivityIndicator size="small" color={colors.common.white} />
                  ) : (
                    <>
                      <Icon name="check-circle" size={ms(18)} color={colors.common.white} />
                      <Text variant="buttonSmall" style={styles.actionBtnText}>{t('orderRequest.accept')}</Text>
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
                        {t('orderRequest.reject')}
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
                  <Icon name="pencil" size={ms(18)} color={colors.common.white} />
                  <Text variant="buttonSmall" style={styles.actionBtnText}>{t('orderRequest.update')}</Text>
                </TouchableOpacity>
              </View>

              {/* Verification Fields — web shows these with the action section */}
              <View style={styles.verificationSection}>
                <Text variant="bodySmall" style={{ color: secondaryTextColor, fontWeight: '600', marginBottom: ms(10) }}>
                  {t('orderRequest.verificationDetails')}
                </Text>

                {/* Row 1: Order Number + Order Status */}
                <View style={styles.verificationRow}>
                  <View style={[styles.verificationField, { flex: 1, marginRight: ms(8) }]}>
                    <Text variant="captionSmall" style={{ color: secondaryTextColor, marginBottom: ms(4) }}>
                      {t('orderRequest.orderNumberLabel')}
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
                      placeholder={t('orderRequest.orderNumberPlaceholder')}
                      placeholderTextColor={isDark ? colors.dark.text.hint : colors.light.text.hint}
                    />
                  </View>
                  <View style={[styles.verificationField, { flex: 1 }]}>
                    <Text variant="captionSmall" style={{ color: secondaryTextColor, marginBottom: ms(4) }}>
                      {t('orderRequest.verifyOrderStatus')}
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
                      {t('orderRequest.verifyOrderDate')}
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
                        {verificationDate ? formatDateLocal(verificationDate) : t('orderRequest.selectDate')}
                      </Text>
                      <Icon name="calendar" size={ms(16)} color={secondaryTextColor} />
                    </TouchableOpacity>
                    <CalendarPickerModal
                      visible={showVerifyDatePicker}
                      selectedDate={verificationDate}
                      onSelect={(date) => setVerificationDate(date)}
                      onClose={() => setShowVerifyDatePicker(false)}
                      isDark={isDark}
                      title={t('orderRequest.verifyOrderDate')}
                    />
                  </View>
                  <View style={[styles.verificationField, { flex: 1 }]}>
                    <Text variant="captionSmall" style={{ color: secondaryTextColor, marginBottom: ms(4) }}>
                      {t('orderRequest.verifyArrivalTime')}
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
                        {verificationTime ? formatTime(verificationTime) : t('orderRequest.selectTime')}
                      </Text>
                      <Icon name="clock-outline" size={ms(16)} color={secondaryTextColor} />
                    </TouchableOpacity>
                    {showVerifyTimePicker && Platform.OS === 'android' && (
                      <DateTimePicker
                        value={
                          verificationTime
                            ? (() => { const p = parseTimeParts(verificationTime); const d = new Date(); if (p) d.setHours(p.hours, p.minutes); return d; })()
                            : new Date()
                        }
                        mode="time"
                        display="default"
                        onChange={(_e: DateTimePickerEvent, d?: Date) => {
                          setShowVerifyTimePicker(false);
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
                label={t('orderRequest.orderStatus')}
                value={
                  order.order_status !== null && order.order_status !== undefined
                    ? ORDER_STATUS_LABELS[order.order_status] || '-'
                    : '-'
                }
                bgColor={colors.orderRequestSection.verification}
                isDark={isDark}
              />
              <View style={{ width: ms(12) }} />
              <QuickStatCard
                icon="calendar-month-outline"
                label={t('orderRequest.onJobDate')}
                value={formatDate(order.on_job_date)}
                sub={order.on_job_time ? formatTime(order.on_job_time) : undefined}
                bgColor={colors.orderRequestSection.timeline}
                isDark={isDark}
              />
            </View>
            <View style={[styles.statsRow, { marginTop: ms(12) }]}>
              <QuickStatCard
                icon="truck-outline"
                label={t('orderRequest.truckRate')}
                value={truckRate}
                sub={order.truck_spacing ? t('orderRequest.minSpacing', { count: order.truck_spacing }) : undefined}
                bgColor={colors.orderRequestSection.details}
                isDark={isDark}
              />
              <View style={{ width: ms(12) }} />
              <QuickStatCard
                icon="package-variant"
                label={t('product.quantity')}
                value={order.quantity ? `${Number(order.quantity).toFixed(2)} ${getVolumeUnit()}` : `0.00 ${getVolumeUnit()}`}
                bgColor={colors.orderRequestSection.products}
                isDark={isDark}
              />
            </View>
          </View>

          {/* ========== JOB DETAILS ========== */}
          <SectionCard
            title={t('orderRequest.jobDetails')}
            icon="briefcase-outline"
            headerColor={colors.secondary.main}
            isDark={isDark}
          >
            <InfoRow label={t('dashboard.company')} value={order.company_name} isDark={isDark} />
            <InfoRow label={t('orderRequest.jobName')} value={order.job_name} isDark={isDark} />
            <InfoRow label={t('orderRequest.usage')} value={order.usage_name || order.usage_code} isDark={isDark} />
            <InfoRow label={t('orderRequest.poNumber')} value={order.po_number} isDark={isDark} />
          </SectionCard>

          {/* ========== JOB LOCATION ========== */}
          <SectionCard
            title={t('orderRequest.jobLocation')}
            icon="map-marker-outline"
            headerColor={colors.orderRequestSection.summary}
            isDark={isDark}
          >
            <InfoRow label={t('orderRequest.address')} value={order.job_address} isDark={isDark} />
            <InfoRow
              label={t('orderRequest.cityStateZip')}
              value={
                [order.job_city, order.job_state, order.job_zip_code]
                  .filter(Boolean)
                  .join(', ') || '-'
              }
              isDark={isDark}
            />
            <InfoRow label={t('orderRequest.jobName')} value={order.job_name} isDark={isDark} />
          </SectionCard>

          {/* ========== JOBSITE CONTACT ========== */}
          <SectionCard
            title={t('orderRequest.jobsiteContact')}
            icon="account-outline"
            headerColor={colors.orderRequestSection.messages}
            isDark={isDark}
          >
            <InfoRow label={t('orderRequest.name')} value={order.job_contact_name} isDark={isDark} />
            <InfoRow label={t('profile.phone')} value={order.job_contact_phone} isDark={isDark} />
          </SectionCard>

          {/* ========== PRODUCTS ========== */}
          <SectionCard
            title={t('orderRequest.products')}
            icon="cube-outline"
            headerColor={colors.orderRequestSection.notes}
            isDark={isDark}
          >
            <ProductRow
              label={t('orderRequest.concrete')}
              code={order.concrete_product_code}
              name={order.concrete_product_name}
              quantity={order.quantity}
              slump={order.slump}
              notes={order.concrete_notes}
              isDark={isDark}
            />
            <ProductRow
              label={t('orderRequest.admixture')}
              code={order.admixture_product_code}
              name={order.admixture_product_name}
              notes={order.admixture_notes}
              isDark={isDark}
            />
            <ProductRow
              label={t('orderRequest.other')}
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
                  {t('orderRequest.noProducts')}
                </Text>
              )}
          </SectionCard>

          {/* ========== ORDER SUMMARY ========== */}
          <SectionCard
            title={t('orderRequest.orderSummary')}
            icon="text-box-outline"
            headerColor={colors.orderRequestSection.scheduling}
            isDark={isDark}
          >
            <View style={[styles.summaryAlert, isDark && styles.summaryAlertDark]}>
              <Text variant="bodySmall" style={{ color: isDark ? colors.orderRequestDetail.summaryAlert.dark.text : colors.orderRequestDetail.summaryAlert.light.text }}>
                <Text variant="bodySmall" style={{ fontWeight: '700', color: isDark ? colors.orderRequestDetail.summaryAlert.dark.textBold : colors.orderRequestDetail.summaryAlert.light.textBold }}>{creatorName || t('orderRequest.user')}</Text>
                {' '}{t('orderRequest.placedRequestFor')}{' '}
                <Text variant="bodySmall" style={{ fontWeight: '700', color: isDark ? colors.orderRequestDetail.summaryAlert.dark.textBold : colors.orderRequestDetail.summaryAlert.light.textBold }}>{order.company_name || '—'}</Text>
              </Text>
            </View>
            <InfoRow label={t('orderRequest.requestNumber')} value={orderCode} isDark={isDark} />
            <InfoRow
              label={t('orderRequest.orderStatus')}
              value={
                order.order_status !== null && order.order_status !== undefined
                  ? ORDER_STATUS_LABELS[order.order_status] || '-'
                  : '-'
              }
              isDark={isDark}
            />
            <InfoRow
              label={t('orderRequest.scheduled')}
              value={
                `${formatDate(order.on_job_date)} ${order.on_job_time ? formatTime(order.on_job_time) : ''}`.trim() || '-'
              }
              isDark={isDark}
            />
            <InfoRow label={t('orderRequest.job')} value={order.job_name} isDark={isDark} />
            <InfoRow
              label={t('orderRequest.address')}
              value={
                [order.job_address, order.job_city, order.job_state, order.job_zip_code]
                  .filter(Boolean)
                  .join(', ') || '-'
              }
              isDark={isDark}
            />
            <InfoRow
              label={t('orderRequest.spacing')}
              value={
                order.truck_spacing
                  ? `${order.truck_spacing} min / ${truckRate}`
                  : '-'
              }
              isDark={isDark}
            />
            {order.driver_instructions ? (
              <InfoRow label={t('orderRequest.driverInstructions')} value={order.driver_instructions} isDark={isDark} />
            ) : null}
          </SectionCard>

          {/* ========== STATUS BANNER ========== */}
          {status === 'approved' && (
            <View style={[styles.statusBanner, { backgroundColor: colors.success.main + '15', borderColor: colors.success.main }]}>
              <Icon name="check-circle" size={ms(20)} color={colors.success.main} />
              <Text variant="body" style={{ color: colors.success.main, marginLeft: ms(8), fontWeight: '600', flex: 1 }}>
                {t('orderRequest.bannerAccepted')}
              </Text>
            </View>
          )}
          {status === 'rejected' && (
            <View style={[styles.statusBanner, { backgroundColor: colors.error.main + '15', borderColor: colors.error.main }]}>
              <Icon name="close-circle" size={ms(20)} color={colors.error.main} />
              <Text variant="body" style={{ color: colors.error.main, marginLeft: ms(8), fontWeight: '600', flex: 1 }}>
                {t('orderRequest.bannerRejected')}
              </Text>
            </View>
          )}
          {status === 'canceled' && (
            <View style={[styles.statusBanner, { backgroundColor: colors.error.main + '15', borderColor: colors.error.main }]}>
              <Icon name="cancel" size={ms(20)} color={colors.error.main} />
              <Text variant="body" style={{ color: colors.error.main, marginLeft: ms(8), fontWeight: '600', flex: 1 }}>
                {t('orderRequest.bannerCanceled')}
              </Text>
            </View>
          )}

          {/* ========== CHAT SECTION ========== */}
          <View
            style={[styles.chatSection, { backgroundColor: cardBg }]}
            onLayout={(e) => {
              chatSectionYRef.current = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.chatHeader}>
              <Icon name="message-text-outline" size={ms(20)} color={colors.primary.main} />
              <Text variant="bodySmall" style={{ color: textColor, fontWeight: '700', marginLeft: ms(8) }}>
                {t('chat.title')}
              </Text>
              <Text variant="captionSmall" style={{ color: secondaryTextColor, marginLeft: ms(6) }}>
                ({messages.length})
              </Text>
            </View>

            {/* Messages list */}
            <ScrollView
              ref={messagesScrollRef}
              style={[
                styles.chatMessagesContainer,
                { backgroundColor: isDark ? colors.chat.dark.messageArea : colors.chat.light.messageArea },
              ]}
              contentContainerStyle={{ paddingVertical: ms(8) }}
              nestedScrollEnabled
              onContentSizeChange={() => {
                // When messages first render after a notification tap, jump to
                // the latest message at the bottom of the inner list. We do
                // this on every content-size change while the flag is still
                // active, then the effect below clears the flag.
                if (shouldScrollToMessages && !didScrollFromNotificationRef.current) {
                  messagesScrollRef.current?.scrollToEnd({ animated: false });
                }
              }}
            >
              {messagesLoading ? (
                <View style={styles.chatLoading}>
                  <ActivityIndicator size="small" color={colors.primary.main} />
                </View>
              ) : processedMessages.length === 0 ? (
                <View style={styles.chatEmpty}>
                  <Icon name="message-outline" size={ms(32)} color={secondaryTextColor} />
                  <Text variant="bodySmall" color="hint" style={{ marginTop: ms(8), textAlign: 'center' }}>
                    {t('orderRequest.noMessagesYet')}
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
                  <ActivityIndicator size="small" color={colors.common.white} />
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

      {/* iOS Time Picker Modal */}
      {showVerifyTimePicker && Platform.OS === 'ios' && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setShowVerifyTimePicker(false)}
        >
          <View style={styles.timePickerOverlay}>
            <View style={[styles.timePickerSheet, { backgroundColor: isDark ? colors.dark.surface : colors.light.surface }]}>
              <View style={[styles.timePickerHeader, { borderBottomColor: isDark ? colors.dark.border : colors.light.border }]}>
                <TouchableOpacity onPress={() => setShowVerifyTimePicker(false)} activeOpacity={0.7}>
                  <Text variant="body" style={{ color: colors.error.main, fontWeight: '600' }}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {t('orderRequest.selectTime')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const h = String(tempVerifyTime.getHours()).padStart(2, '0');
                    const m = String(tempVerifyTime.getMinutes()).padStart(2, '0');
                    setVerificationTime(`${h}:${m}`);
                    setShowVerifyTimePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text variant="body" style={{ color: colors.primary.main, fontWeight: '600' }}>
                    {t('common.done')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timePickerSpinner}>
                <DateTimePicker
                  value={
                    verificationTime
                      ? (() => { const p = parseTimeParts(verificationTime); const d = new Date(); if (p) d.setHours(p.hours, p.minutes); return d; })()
                      : tempVerifyTime
                  }
                  mode="time"
                  display="spinner"
                  onChange={(_e: DateTimePickerEvent, d?: Date) => {
                    if (d) setTempVerifyTime(d);
                  }}
                  themeVariant={isDark ? 'dark' : 'light'}
                  textColor={isDark ? colors.dark.text.primary : colors.light.text.primary}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  timePickerOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'flex-end',
  },
  timePickerSheet: {
    borderTopLeftRadius: ms(20),
    borderTopRightRadius: ms(20),
    paddingBottom: ms(34),
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timePickerSpinner: {
    height: ms(216),
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default OrderRequestDetailScreen;
