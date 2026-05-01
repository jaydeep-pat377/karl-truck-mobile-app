import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Share,
  Animated,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import { useRoute, useNavigation, RouteProp, NavigationProp } from '@react-navigation/native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import RNShare from 'react-native-share';
import { Icon } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { deleteScanRecord } from '../../utils/scanStorage';
import { generateTicketPdf } from '../../utils/ticketPdf';
import type { TKTicketData, APITicketDetails, APITruckDetails } from '../../types/qrScan';
import { SettingsStackParamList } from '../../navigation/SettingsNavigator';

type RouteProps = RouteProp<SettingsStackParamList, 'ScanDetails'>;

// ── Dynamic themed styles factory ──
function createThemedStyles(isDark: boolean) {
  const tc = isDark ? colors.dark : colors.light;
  const tint = isDark ? 'rgba(69,139,0,0.15)' : 'rgba(69,139,0,0.08)';
  const tintStrong = isDark ? 'rgba(69,139,0,0.2)' : 'rgba(69,139,0,0.1)';
  const dangerBg = isDark ? 'rgba(196,57,38,0.15)' : colors.error.background;
  const shadow = { shadowColor: colors.common.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 };
  const shadowMd = { shadowColor: colors.common.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 };

  return {
    tc,
    tint,
    tintStrong,
    dangerBg,
    styles: StyleSheet.create({
      container: { flex: 1, backgroundColor: tc.background },
      header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
      headerBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: tc.surface },
      headerBtnSpacer: { width: 32, height: 32 },
      headerTitle: { fontSize: 24, fontWeight: '600', flex: 1, textAlign: 'center', color: tc.text.primary },
      content: { padding: 16, paddingTop: 24, paddingBottom: 120 },

      // Hero
      hero: { alignItems: 'center', marginBottom: 24 },
      heroCircleTicket: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 16, backgroundColor: tint },
      heroCircleTruck: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 16, backgroundColor: colors.info.background },
      heroCircleGeneric: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 16, backgroundColor: tint },
      heroLabel: { fontSize: 20, fontWeight: '600', lineHeight: 25, marginBottom: 8, color: tc.text.primary },
      badgeVerified: { borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 5, backgroundColor: colors.success.background },
      badgeOffline: { borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 5, backgroundColor: colors.warning.background },
      badgeUnverified: { borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 5, backgroundColor: tc.surface },
      badgeGeneric: { borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 5, backgroundColor: tintStrong },
      badgeTextVerified: { fontSize: 12, fontWeight: '600', lineHeight: 18, color: colors.success.main },
      badgeTextOffline: { fontSize: 12, fontWeight: '600', lineHeight: 18, color: colors.warning.main },
      badgeTextUnverified: { fontSize: 12, fontWeight: '600', lineHeight: 18, color: tc.text.secondary },
      badgeTextGeneric: { fontSize: 12, fontWeight: '600', lineHeight: 18, color: colors.primary.main },

      // Tenant accent card
      contentCard: { flexDirection: 'row', borderRadius: 16, marginBottom: 16, overflow: 'hidden', backgroundColor: tc.surface, ...shadow },
      accentStripSuccess: { width: 3, backgroundColor: colors.success.main },
      accentStripPrimary: { width: 3, backgroundColor: colors.primary.main },
      contentCardInner: { flex: 1, padding: 16 },
      contentCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
      cardLabel: { fontSize: 12, fontWeight: '500', lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase', color: tc.text.hint },
      tenantName: { fontSize: 20, fontWeight: '600', lineHeight: 25, marginTop: 4, color: tc.text.primary },
      tenantSub: { fontSize: 14, lineHeight: 21, marginTop: 4, color: tc.text.secondary },
      dataText: { fontSize: 16, lineHeight: 24, color: tc.text.primary },

      // Info cards
      card: { borderRadius: 16, padding: 16, marginBottom: 16, backgroundColor: tc.surface, ...shadow },
      sectionTitle: { fontSize: 12, fontWeight: '500', lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, color: tc.text.hint },
      infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
      infoLabel: { fontSize: 14, lineHeight: 21, color: tc.text.secondary },
      infoValue: { fontSize: 14, fontWeight: '500', lineHeight: 21, flex: 1, textAlign: 'right', marginLeft: 16, color: tc.text.primary },
      divider: { height: StyleSheet.hairlineWidth, backgroundColor: tc.border },

      // Actions
      actions: { marginTop: 12 },
      actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, height: 44, marginBottom: 12 },
      actionIcon: { marginRight: 8 },
      actionTextPrimary: { fontSize: 16, fontWeight: '600', lineHeight: 17.6, color: colors.primary.contrast },
      actionTextSecondary: { fontSize: 16, fontWeight: '600', lineHeight: 17.6, color: tc.text.primary },
      actionTextDanger: { fontSize: 16, fontWeight: '600', lineHeight: 17.6, color: colors.error.main },
      primaryAction: { backgroundColor: colors.primary.main, ...shadow },
      secondaryAction: { borderWidth: 1, backgroundColor: tc.surface, borderColor: tc.border },
      dangerAction: { backgroundColor: dangerBg },
      actionRow: { flexDirection: 'row', gap: 12 },
      flex1: { flex: 1 },

      // Copy icon
      copyIcon: { color: tc.text.secondary },

      // Toast
      toast: { position: 'absolute', top: 16, alignSelf: 'center', backgroundColor: colors.success.main, borderRadius: 9999, paddingHorizontal: 24, paddingVertical: 12, ...shadowMd },
      toastText: { fontSize: 14, fontWeight: '500', lineHeight: 15.4, color: colors.common.white },

      // Modal
      modalOverlay: { flex: 1, backgroundColor: colors.overlay.medium, justifyContent: 'flex-end' },
      modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingHorizontal: 32, alignItems: 'center', backgroundColor: tc.surface },
      modalHandle: { width: 40, height: 4, borderRadius: 2, marginBottom: 24, backgroundColor: tc.border },
      modalIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
      modalTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 12, color: tc.text.primary },
      modalMessage: { fontSize: 16, textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 16, color: tc.text.secondary },
      modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
      modalBtnCancel: { flex: 1, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: tc.background, borderWidth: 1, borderColor: tc.border },
      modalBtnDestructive: { flex: 1, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.error.main },
      modalBtnDefault: { flex: 1, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary.main },
      modalBtnTextLight: { fontSize: 16, fontWeight: '600', color: colors.common.white },
      modalBtnTextThemed: { fontSize: 16, fontWeight: '600', color: tc.text.primary },
    }),
  };
}

// ── Themed Modal ──
interface ThemedModalProps {
  visible: boolean;
  icon: string;
  iconColor?: string;
  iconBg?: string;
  title: string;
  message: string;
  buttons: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }>;
  onDismiss: () => void;
}

const ThemedModal: React.FC<ThemedModalProps & { themed: ReturnType<typeof createThemedStyles> }> = ({ visible, icon, iconColor, iconBg, title, message, buttons, onDismiss, themed }) => {
  const insets = useSafeAreaInsets();
  const st = themed.styles;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={st.modalOverlay} onPress={onDismiss}>
        <Pressable style={[st.modalCard, { paddingBottom: Math.max(insets.bottom, 24) }]} onPress={() => {}}>
          <View style={st.modalHandle} />
          <View style={[st.modalIcon, { backgroundColor: iconBg || colors.error.main }]}>
            <Icon name={icon} size={28} color={iconColor || colors.common.white} />
          </View>
          <Text style={st.modalTitle}>{title}</Text>
          <Text style={st.modalMessage}>{message}</Text>
          <View style={st.modalButtons}>
            {buttons.map((btn, i) => {
              const isC = btn.style === 'cancel';
              const isD = btn.style === 'destructive';
              return (
                <TouchableOpacity key={i} style={isC ? st.modalBtnCancel : isD ? st.modalBtnDestructive : st.modalBtnDefault} onPress={btn.onPress || onDismiss} activeOpacity={0.8}>
                  <Text style={isC ? st.modalBtnTextThemed : st.modalBtnTextLight}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const ScanDetailsScreen: React.FC = () => {
  const { isDark } = useTheme();
  const themed = useMemo(() => createThemedStyles(isDark), [isDark]);
  const st = themed.styles;
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp<SettingsStackParamList>>();
  const { scan } = route.params;
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; icon: string; iconColor?: string; iconBg?: string; title: string; message: string; buttons: ThemedModalProps['buttons'] }>({ visible: false, icon: '', title: '', message: '', buttons: [] });

  const showConfirm = useCallback((opts: Omit<typeof confirmModal, 'visible'>) => setConfirmModal({ ...opts, visible: true }), []);
  const hideConfirm = useCallback(() => setConfirmModal(prev => ({ ...prev, visible: false })), []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const dataType = useMemo(() => {
    const d = scan.data;
    if (/^https?:\/\//i.test(d)) return 'url';
    if (/^mailto:/i.test(d)) return 'email';
    if (/^tel:/i.test(d)) return 'phone';
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(d)) return 'email_plain';
    if (/^\+?[\d\s()-]{7,}$/.test(d)) return 'phone_plain';
    return 'text';
  }, [scan.data]);

  const dataTypeLabel = useMemo(() => ({ url: 'Website URL', email: 'Email Link', email_plain: 'Email Address', phone: 'Phone Link', phone_plain: 'Phone Number', text: 'Plain Text' }[dataType] || 'Data'), [dataType]);
  const dataTypeIcon = useMemo(() => ({ url: 'globe-outline', email: 'mail-outline', email_plain: 'mail-outline', phone: 'phone-outline', phone_plain: 'phone-outline', text: 'text-box-outline' }[dataType] || 'file-document-outline'), [dataType]);

  const formatTs = (ts: number) => new Date(ts).toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatIat = (iat: number) => new Date(iat).toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg); setToastVisible(true); toastAnim.setValue(0);
    Animated.sequence([Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }), Animated.delay(1500), Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true })]).start(() => setToastVisible(false));
  }, [toastAnim]);

  const handleCopy = useCallback(() => { Clipboard.setString(scan.data); showToast('Copied to clipboard'); }, [scan.data, showToast]);
  const handleShare = useCallback(async () => { try { await Share.share({ message: scan.data }); } catch {} }, [scan.data]);
  const handleOpenLink = useCallback(() => {
    let url = scan.data;
    if (dataType === 'email_plain') url = `mailto:${scan.data}`;
    else if (dataType === 'phone_plain') url = `tel:${scan.data}`;
    Linking.canOpenURL(url).then(ok => { if (ok) Linking.openURL(url); else showConfirm({ icon: 'link-off', iconBg: colors.warning.main, title: 'Cannot Open Link', message: 'This link type is not supported.', buttons: [{ text: 'OK', onPress: hideConfirm }] }); });
  }, [scan.data, dataType, showConfirm, hideConfirm]);

  const handleDelete = useCallback(() => {
    showConfirm({ icon: 'delete-outline', iconBg: colors.error.main, title: 'Delete Scan', message: 'Are you sure you want to delete this scan?', buttons: [{ text: 'Cancel', style: 'cancel', onPress: hideConfirm }, { text: 'Delete', style: 'destructive', onPress: async () => { hideConfirm(); await deleteScanRecord(scan.id); navigation.goBack(); } }] });
  }, [scan.id, navigation, showConfirm, hideConfirm]);

  const handleViewPdf = useCallback(async () => {
    if (!scan.tkData) return;
    setDownloading(true);
    try {
      const filePath = await generateTicketPdf(scan);
      const ticketCode = (scan.tkData as TKTicketData).ticketCode || 'ticket';
      navigation.navigate('PdfViewer', { filePath, title: `Ticket ${ticketCode}` });
    } catch (err) {
      showConfirm({ icon: 'alert-circle-outline', iconBg: colors.warning.main, title: 'Error', message: err instanceof Error ? err.message : 'Could not generate PDF', buttons: [{ text: 'OK', onPress: hideConfirm }] });
    } finally { setDownloading(false); }
  }, [scan, navigation, showConfirm, hideConfirm]);

  const handleSharePdf = useCallback(async () => {
    if (!scan.tkData) return;
    setSharing(true);
    try {
      const filePath = await generateTicketPdf(scan);
      const ticketCode = (scan.tkData as TKTicketData).ticketCode || 'ticket';
      const tenantName = (scan.tkData as TKTicketData).tenantName || '';
      const sharePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/ticket-${ticketCode}.pdf`;
      await ReactNativeBlobUtil.fs.cp(filePath, sharePath);
      await RNShare.open({ title: `Share Ticket ${ticketCode}`, message: tenantName ? `Ticket ${ticketCode} \u2014 ${tenantName}` : `Ticket ${ticketCode}`, url: Platform.OS === 'android' ? `file://${sharePath}` : sharePath, type: 'application/pdf', failOnCancel: false });
    } catch {} finally { setSharing(false); }
  }, [scan]);

  const canOpenLink = ['url', 'email', 'email_plain', 'phone', 'phone_plain'].includes(dataType);
  const tkData = scan.tkData;
  const isTicket = tkData?.kind === 'ticket';
  const isTruck = tkData?.kind === 'truck';
  const verified = scan.verified;
  const apiData = scan.apiData;
  const apiTicket = isTicket ? (apiData as APITicketDetails | undefined) : undefined;
  const apiTruck = isTruck ? (apiData as APITruckDetails | undefined) : undefined;
  const headerTitle = isTicket ? `Ticket ${apiTicket?.ticket_code || (tkData as TKTicketData)?.ticketCode || ''}` : isTruck ? `Truck ${apiTruck?.code || (tkData as any)?.truckCode || ''}` : 'Scan Details';

  const toastTY = toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

  const badgeStyle = verified === 'verified' ? st.badgeVerified : verified === 'offline' ? st.badgeOffline : st.badgeUnverified;
  const badgeTextStyle = verified === 'verified' ? st.badgeTextVerified : verified === 'offline' ? st.badgeTextOffline : st.badgeTextUnverified;
  const badgeLabel = verified === 'verified' ? 'Verified' : verified === 'offline' ? 'Offline \u2014 Local Data' : 'Unverified';

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={st.infoRow}>
      <Text style={st.infoLabel}>{label}</Text>
      <Text style={st.infoValue}>{value}</Text>
    </View>
  );
  const Div = () => <View style={st.divider} />;

  const Header = () => (
    <View style={st.header}>
      <TouchableOpacity style={st.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Icon name="arrow-left" size={22} color={themed.tc.text.primary} />
      </TouchableOpacity>
      <Text style={st.headerTitle} numberOfLines={1}>{headerTitle}</Text>
      <View style={st.headerBtnSpacer} />
    </View>
  );

  const Toast = () => toastVisible ? (
    <Animated.View style={[st.toast, { opacity: toastAnim, transform: [{ translateY: toastTY }] }]} pointerEvents="none">
      <Text style={st.toastText}>{toastMessage}</Text>
    </Animated.View>
  ) : null;

  // ── TK DATA (ticket / truck) ──
  if (tkData) {
    const ticketLocal = tkData as TKTicketData;
    return (
      <SafeAreaView style={st.container} edges={['top', 'bottom']}>
        <Header />
        <Animated.ScrollView style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
          <View style={st.hero}>
            <View style={isTicket ? st.heroCircleTicket : st.heroCircleTruck}>
              <Icon name={isTicket ? 'ticket-confirmation-outline' : 'truck-outline'} size={40} color={colors.primary.main} />
            </View>
            <Text style={st.heroLabel}>{isTicket ? 'Ticket' : 'Truck'}</Text>
            <View style={badgeStyle}><Text style={badgeTextStyle}>{badgeLabel}</Text></View>
          </View>

          <View style={st.contentCard}>
            <View style={st.accentStripSuccess} />
            <View style={st.contentCardInner}>
              <Text style={st.cardLabel}>TENANT</Text>
              <Text style={st.tenantName}>{tkData.tenantName || 'Unknown'}</Text>
              <Text style={st.tenantSub}>{tkData.tenantSubdomain}</Text>
            </View>
          </View>

          {isTicket && (
            <>
              <View style={st.card}>
                <Text style={st.sectionTitle}>TICKET INFORMATION</Text>
                <Row label="Order" value={apiTicket?.order_code || ticketLocal.orderCode} />
                {apiTicket?.order_date && (<><Div /><Row label="Order Date" value={apiTicket.order_date} /></>)}
                <Div /><Row label="Truck" value={apiTicket?.truck?.truck_code || ticketLocal.truckCode} />
                {apiTicket?.truck?.truck_description && (<><Div /><Row label="Truck Description" value={apiTicket.truck.truck_description} /></>)}
                {apiTicket?.driver_name && (<><Div /><Row label="Driver" value={apiTicket.driver_name} /></>)}
                {apiTicket?.plant_name && (<><Div /><Row label="Plant" value={apiTicket.plant_name} /></>)}
                {apiTicket?.status_display && (<><Div /><Row label="Status" value={apiTicket.status_display} /></>)}
                {apiTicket?.load && (<><Div /><Row label="Load" value={apiTicket.load} /></>)}
              </View>

              {(apiTicket?.product || apiTicket?.load_qty || apiTicket?.progress_display) && (
                <View style={st.card}>
                  <Text style={st.sectionTitle}>PRODUCT & QUANTITY</Text>
                  {apiTicket?.product && <Row label="Product" value={apiTicket.product} />}
                  {apiTicket?.load_qty && (<>{apiTicket?.product && <Div />}<Row label="Load Qty" value={apiTicket.load_qty} /></>)}
                  {apiTicket?.run_qty_ord_qty && (<><Div /><Row label="Running / Ordered" value={apiTicket.run_qty_ord_qty} /></>)}
                  {apiTicket?.progress_display && (<><Div /><Row label="Progress" value={apiTicket.progress_display} /></>)}
                </View>
              )}

              {(apiTicket?.customer_name || apiTicket?.delivery_address) && (
                <View style={st.card}>
                  <Text style={st.sectionTitle}>CUSTOMER & DELIVERY</Text>
                  {apiTicket?.customer_name && <Row label="Customer" value={apiTicket.customer_name} />}
                  {apiTicket?.project_name && (<>{apiTicket?.customer_name && <Div />}<Row label="Project" value={apiTicket.project_name} /></>)}
                  {apiTicket?.delivery_address && (<><Div /><Row label="Delivery Address" value={apiTicket.delivery_address} /></>)}
                </View>
              )}

              {apiTicket?.timestamps && (
                <View style={st.card}>
                  <Text style={st.sectionTitle}>TIMELINE</Text>
                  {apiTicket.timestamps.ticketed && <Row label="Ticketed" value={apiTicket.timestamps.ticketed} />}
                  {apiTicket.timestamps.loading && (<><Div /><Row label="Loading" value={apiTicket.timestamps.loading} /></>)}
                  {apiTicket.timestamps.loaded && (<><Div /><Row label="Loaded" value={apiTicket.timestamps.loaded} /></>)}
                  {apiTicket.timestamps.to_job && (<><Div /><Row label="To Job" value={apiTicket.timestamps.to_job} /></>)}
                  {apiTicket.timestamps.eta_at_job && (<><Div /><Row label="ETA At Job" value={apiTicket.timestamps.eta_at_job} /></>)}
                  {apiTicket.timestamps.at_job && (<><Div /><Row label="At Job" value={apiTicket.timestamps.at_job} /></>)}
                  {apiTicket.timestamps.pouring && (<><Div /><Row label="Pouring" value={apiTicket.timestamps.pouring} /></>)}
                  {apiTicket.timestamps.washing && (<><Div /><Row label="Washing" value={apiTicket.timestamps.washing} /></>)}
                  {apiTicket.timestamps.to_plant && (<><Div /><Row label="To Plant" value={apiTicket.timestamps.to_plant} /></>)}
                  {apiTicket.timestamps.at_plant && (<><Div /><Row label="At Plant" value={apiTicket.timestamps.at_plant} /></>)}
                </View>
              )}

              <View style={st.card}>
                <Text style={st.sectionTitle}>SCAN INFORMATION</Text>
                <Row label="Scanned At" value={formatTs(scan.timestamp)} />
                <Div /><Row label="QR Issued At" value={formatIat(tkData.iat)} />
              </View>
            </>
          )}

          {isTruck && (
            <>
              <View style={st.card}>
                <Text style={st.sectionTitle}>TRUCK INFORMATION</Text>
                <Row label="Truck Code" value={apiTruck?.code || (tkData as any).truckCode} />
                {apiTruck?.description && (<><Div /><Row label="Description" value={apiTruck.description} /></>)}
                {apiTruck?.owner_name && (<><Div /><Row label="Owner" value={apiTruck.owner_name} /></>)}
                {apiTruck?.ticket_status && (<><Div /><Row label="Status" value={apiTruck.ticket_status} /></>)}
                {apiTruck?.is_active_delivery !== undefined && (<><Div /><Row label="Active Delivery" value={apiTruck.is_active_delivery ? 'Yes' : 'No'} /></>)}
              </View>

              {(apiTruck?.current_plant_name || apiTruck?.current_plant_code) && (
                <View style={st.card}>
                  <Text style={st.sectionTitle}>CURRENT PLANT</Text>
                  {apiTruck.current_plant_name && <Row label="Plant Name" value={apiTruck.current_plant_name} />}
                  {apiTruck.current_plant_code && (<>{apiTruck.current_plant_name && <Div />}<Row label="Plant Code" value={apiTruck.current_plant_code} /></>)}
                </View>
              )}

              {(apiTruck?.current_driver_name || apiTruck?.driver_code || apiTruck?.driver_phone) && (
                <View style={st.card}>
                  <Text style={st.sectionTitle}>DRIVER</Text>
                  {apiTruck.current_driver_name && <Row label="Driver Name" value={apiTruck.current_driver_name} />}
                  {apiTruck.driver_code && (<>{apiTruck.current_driver_name && <Div />}<Row label="Driver Code" value={apiTruck.driver_code} /></>)}
                  {apiTruck.driver_phone && (<><Div /><Row label="Driver Phone" value={apiTruck.driver_phone} /></>)}
                </View>
              )}

              {(apiTruck?.ticket_code || apiTruck?.order_code || apiTruck?.customer_name || apiTruck?.delivery_address || apiTruck?.product_code || apiTruck?.plant_name) && (
                <View style={st.card}>
                  <Text style={st.sectionTitle}>DELIVERY DETAILS</Text>
                  {apiTruck.ticket_code && <Row label="Ticket" value={apiTruck.ticket_code} />}
                  {apiTruck.order_code && (<>{apiTruck.ticket_code && <Div />}<Row label="Order" value={apiTruck.order_code} /></>)}
                  {apiTruck.customer_name && (<><Div /><Row label="Customer" value={apiTruck.customer_name} /></>)}
                  {apiTruck.delivery_address && (<><Div /><Row label="Delivery Address" value={apiTruck.delivery_address} /></>)}
                  {apiTruck.product_code && (<><Div /><Row label="Product" value={apiTruck.product_code} /></>)}
                  {apiTruck.truck_qty != null && (<><Div /><Row label="Quantity" value={String(apiTruck.truck_qty)} /></>)}
                  {apiTruck.plant_name && (<><Div /><Row label="Plant" value={apiTruck.plant_name} /></>)}
                  {apiTruck.plant_phone && (<><Div /><Row label="Plant Phone" value={apiTruck.plant_phone} /></>)}
                </View>
              )}

              <View style={st.card}>
                <Text style={st.sectionTitle}>SCAN INFORMATION</Text>
                <Row label="Scanned At" value={formatTs(scan.timestamp)} />
                <Div /><Row label="QR Issued At" value={formatIat(tkData.iat)} />
              </View>
            </>
          )}

          <View style={st.actions}>
            {isTicket && (
              <TouchableOpacity style={[st.actionBtn, st.primaryAction]} onPress={handleViewPdf} disabled={downloading} activeOpacity={0.8}>
                {downloading ? <ActivityIndicator size="small" color={colors.primary.contrast} style={st.actionIcon} /> : <Icon name="eye-outline" size={18} color={colors.primary.contrast} style={st.actionIcon} />}
                <Text style={st.actionTextPrimary}>{downloading ? 'Loading...' : 'View Ticket'}</Text>
              </TouchableOpacity>
            )}
            {isTicket && (
              <TouchableOpacity style={[st.actionBtn, st.secondaryAction]} onPress={handleSharePdf} disabled={sharing} activeOpacity={0.8}>
                {sharing ? <ActivityIndicator size="small" color={themed.tc.text.primary} style={st.actionIcon} /> : <Icon name="share-variant-outline" size={18} color={themed.tc.text.primary} style={st.actionIcon} />}
                <Text style={st.actionTextSecondary}>{sharing ? 'Sharing...' : 'Share'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[st.actionBtn, st.dangerAction]} onPress={handleDelete} activeOpacity={0.8}>
              <Icon name="delete-outline" size={18} color={colors.error.main} style={st.actionIcon} />
              <Text style={st.actionTextDanger}>Delete Scan</Text>
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>
        <Toast />
        <ThemedModal visible={confirmModal.visible} icon={confirmModal.icon} iconColor={confirmModal.iconColor} iconBg={confirmModal.iconBg} title={confirmModal.title} message={confirmModal.message} buttons={confirmModal.buttons} onDismiss={hideConfirm} themed={themed} />
      </SafeAreaView>
    );
  }

  // ── GENERIC SCAN ──
  return (
    <SafeAreaView style={st.container} edges={['top', 'bottom']}>
      <Header />
      <Animated.ScrollView style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <View style={st.hero}>
          <View style={st.heroCircleGeneric}>
            <Icon name={dataTypeIcon} size={40} color={colors.primary.main} />
          </View>
          <Text style={st.heroLabel}>{dataTypeLabel}</Text>
          <View style={st.badgeGeneric}><Text style={st.badgeTextGeneric}>QR Code</Text></View>
        </View>

        <View style={st.contentCard}>
          <View style={st.accentStripPrimary} />
          <View style={st.contentCardInner}>
            <View style={st.contentCardHeader}>
              <Text style={st.cardLabel}>SCANNED CONTENT</Text>
              <TouchableOpacity onPress={handleCopy} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="content-copy" size={16} color={themed.tc.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={st.dataText} selectable>{scan.data}</Text>
          </View>
        </View>

        <View style={st.card}>
          <Row label="Format" value="QR Code" />
          <Div /><Row label="Scanned At" value={formatTs(scan.timestamp)} />
          <Div /><Row label="Content Type" value={dataTypeLabel} />
          <Div /><Row label="Characters" value={String(scan.data.length)} />
        </View>

        <View style={st.actions}>
          {canOpenLink && (
            <TouchableOpacity style={[st.actionBtn, st.primaryAction]} onPress={handleOpenLink} activeOpacity={0.8}>
              <Icon name={dataType === 'url' ? 'web' : dataType.includes('email') ? 'email-outline' : 'phone-outline'} size={18} color={colors.primary.contrast} style={st.actionIcon} />
              <Text style={st.actionTextPrimary}>{dataType === 'url' ? 'Open URL' : dataType.includes('email') ? 'Send Email' : 'Call Number'}</Text>
            </TouchableOpacity>
          )}
          <View style={st.actionRow}>
            <TouchableOpacity style={[st.actionBtn, st.secondaryAction, st.flex1]} onPress={handleCopy} activeOpacity={0.8}>
              <Icon name="content-copy" size={18} color={themed.tc.text.primary} style={st.actionIcon} />
              <Text style={st.actionTextSecondary}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.actionBtn, st.secondaryAction, st.flex1]} onPress={handleShare} activeOpacity={0.8}>
              <Icon name="share-variant-outline" size={18} color={themed.tc.text.primary} style={st.actionIcon} />
              <Text style={st.actionTextSecondary}>Share</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[st.actionBtn, st.dangerAction]} onPress={handleDelete} activeOpacity={0.8}>
            <Icon name="delete-outline" size={18} color={colors.error.main} style={st.actionIcon} />
            <Text style={st.actionTextDanger}>Delete Scan</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
      <Toast />
      <ThemedModal visible={confirmModal.visible} icon={confirmModal.icon} iconColor={confirmModal.iconColor} iconBg={confirmModal.iconBg} title={confirmModal.title} message={confirmModal.message} buttons={confirmModal.buttons} onDismiss={hideConfirm} themed={themed} />
    </SafeAreaView>
  );
};

export default ScanDetailsScreen;
