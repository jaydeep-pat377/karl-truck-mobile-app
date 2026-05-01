import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Text, Card, Icon } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { getScanHistory, deleteScanRecord, clearScanHistory } from '../../utils/scanStorage';
import type { ScanRecord, Pagination, APITicketDetails } from '../../types/qrScan';
import { SettingsStackParamList } from '../../navigation/SettingsNavigator';

const PAGE_SIZE = 20;

// ── Themed Confirm Modal ──
interface ConfirmModalState {
  visible: boolean;
  icon: string;
  iconBg: string;
  title: string;
  message: string;
  confirmText: string;
  confirmStyle: 'destructive' | 'default';
  onConfirm: () => void;
}

const INITIAL_MODAL: ConfirmModalState = {
  visible: false,
  icon: '',
  iconBg: '',
  title: '',
  message: '',
  confirmText: '',
  confirmStyle: 'default',
  onConfirm: () => {},
};

export const TicketScanHistoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<SettingsStackParamList>>();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();

  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [modal, setModal] = useState<ConfirmModalState>(INITIAL_MODAL);
  const currentPage = useRef(1);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const hideModal = useCallback(() => setModal(prev => ({ ...prev, visible: false })), []);

  const closeSwipeable = useCallback((id: string) => {
    swipeableRefs.current.get(id)?.close();
  }, []);

  const handleDeleteItem = useCallback(
    (item: ScanRecord) => {
      closeSwipeable(item.id);
      setModal({
        visible: true,
        icon: 'delete-outline',
        iconBg: colors.error.main,
        title: t('scanHistory.deleteScan'),
        message: t('scanHistory.deleteConfirmFull'),
        confirmText: t('common.delete'),
        confirmStyle: 'destructive',
        onConfirm: async () => {
          hideModal();
          await deleteScanRecord(item.id);
          setHistory(prev => prev.filter(h => h.id !== item.id));
          if (pagination) {
            setPagination(p => p ? { ...p, total: p.total - 1 } : null);
          }
        },
      });
    },
    [closeSwipeable, pagination, hideModal],
  );

  const loadHistory = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        const result = await getScanHistory(page, PAGE_SIZE);
        if (append) {
          setHistory(prev => [...prev, ...(result?.records ?? [])]);
        } else {
          setHistory(result?.records ?? []);
        }
        setPagination(result?.pagination ?? null);
        currentPage.current = result?.pagination?.page ?? page;
      } catch {
        if (!append) setHistory([]);
        setPagination(null);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      setInitialLoading(true);
      loadHistory(1).finally(() => setInitialLoading(false));
    }, [loadHistory]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory(1);
    setRefreshing(false);
  }, [loadHistory]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || !pagination?.has_next) return;
    setLoadingMore(true);
    await loadHistory(currentPage.current + 1, true);
    setLoadingMore(false);
  }, [loadHistory, loadingMore, pagination]);

  const handleClearHistory = useCallback(() => {
    setModal({
      visible: true,
      icon: 'delete-sweep-outline',
      iconBg: colors.error.main,
      title: t('scanHistory.clearAllHistory'),
      message: t('scanHistory.clearAllConfirm'),
      confirmText: t('scanHistory.clearAll'),
      confirmStyle: 'destructive',
      onConfirm: async () => {
        hideModal();
        await clearScanHistory();
        setHistory([]);
        setPagination(null);
      },
    });
  }, [hideModal]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('scanHistory.justNow');
    if (diffMins < 60) return t('scanHistory.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('scanHistory.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('scanHistory.daysAgo', { count: diffDays });
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const totalCount = pagination?.total ?? history.length;

  const renderRightActions = (
    item: ScanRecord,
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={[styles.swipeDeleteBtn, { backgroundColor: colors.error.main }]}
        onPress={() => handleDeleteItem(item)}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon name="delete-outline" size={ms(22)} color={colors.common.white} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: ScanRecord }) => {
    const tkData = item.tkData;
    const apiData = item.apiData;
    const isTicket = tkData?.kind === 'ticket';
    const isTruck = tkData?.kind === 'truck';
    const isTK = isTicket || isTruck;

    const ticketCode = isTicket
      ? (apiData as APITicketDetails)?.ticket_code || (tkData as any)?.ticketCode
      : null;
    const truckCode = isTruck
      ? (apiData as any)?.code || (tkData as any)?.truckCode
      : null;
    const tenantName = tkData?.tenantName || null;

    const iconName = isTicket
      ? 'ticket-confirmation-outline'
      : isTruck
        ? 'truck-outline'
        : 'qrcode-scan';

    const title = isTicket
      ? `Ticket ${ticketCode || '\u2014'}`
      : isTruck
        ? `Truck ${truckCode || '\u2014'}`
        : item.data;

    return (
      <Swipeable
        ref={ref => {
          if (ref) swipeableRefs.current.set(item.id, ref);
          else swipeableRefs.current.delete(item.id);
        }}
        renderRightActions={(progress, dragX) => renderRightActions(item, progress, dragX)}
        overshootRight={false}
        rightThreshold={40}
      >
        <TouchableOpacity
          style={[styles.card, { backgroundColor: themeColors.surface }]}
          onPress={() => navigation.navigate('ScanDetails', { scan: item })}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.cardIcon,
              {
                backgroundColor: isTicket
                  ? colors.primary.main + '15'
                  : isTruck
                    ? colors.info.main + '15'
                    : themeColors.background,
              },
            ]}
          >
            <Icon
              name={iconName}
              size={ms(22)}
              color={isTicket ? colors.primary.main : isTruck ? colors.info.main : colors.primary.main}
            />
          </View>
          <View style={styles.cardContent}>
            <Text variant="bodySmall" style={{ fontWeight: '600' }} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.cardMeta}>
              {tenantName ? (
                <View style={[styles.tenantBadge, { backgroundColor: colors.primary.main + '15' }]}>
                  <Text variant="captionSmall" style={{ color: colors.primary.main, fontWeight: '500' }}>
                    {tenantName}
                  </Text>
                </View>
              ) : !isTK ? (
                <View style={[styles.tenantBadge, { backgroundColor: colors.primary.main + '15' }]}>
                  <Text variant="captionSmall" style={{ color: colors.primary.main, fontWeight: '500' }}>
                    {t('scanHistory.qrCode')}
                  </Text>
                </View>
              ) : null}
              <Text variant="caption" color="hint">{formatDate(item.timestamp)}</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={ms(20)} color={themeColors.text.hint} />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderEmpty = () => {
    if (initialLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: themeColors.surface }]}>
          <Icon name="qrcode-scan" size={ms(48)} color={themeColors.text.hint} />
        </View>
        <Text variant="body" style={{ fontWeight: '600', marginBottom: ms(4) }}>
          {t('scanHistory.noScansYet')}
        </Text>
        <Text variant="caption" color="hint" style={{ textAlign: 'center' }}>
          {t('scanHistory.noScansHint')}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary.main} />
        <Text variant="caption" color="secondary" style={{ marginLeft: spacing.sm }}>
          {t('common.loadingMore')}
        </Text>
      </View>
    );
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: themeColors.surface }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
          </TouchableOpacity>
          <Text variant="h2">{t('scanHistory.title')}</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: themeColors.surface }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
        </TouchableOpacity>
        <Text variant="h2">{t('scanHistory.title')}</Text>
        {history.length > 0 ? (
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.error.main + '15' }]}
            onPress={handleClearHistory}
            activeOpacity={0.7}
          >
            <Icon name="delete-outline" size={ms(18)} color={colors.error.main} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      {/* Count & clear */}
      {totalCount > 0 && (
        <View style={styles.subHeader}>
          <Text variant="caption" color="secondary">
            {t('scanHistory.scansCount', { count: totalCount })}
          </Text>
          <TouchableOpacity onPress={handleClearHistory} activeOpacity={0.7}>
            <Text variant="caption" style={{ color: colors.error.main, fontWeight: '600' }}>
              {t('scanHistory.clearAll')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={history.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />

      {/* Themed Confirm Modal */}
      <Modal
        visible={modal.visible}
        transparent
        animationType="slide"
        onRequestClose={hideModal}
      >
        <Pressable style={styles.modalOverlay} onPress={hideModal}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: themeColors.surface,
                paddingBottom: Math.max(insets.bottom, ms(24)),
              },
            ]}
            onPress={() => {}}
          >
            <View style={[styles.modalHandle, { backgroundColor: themeColors.border }]} />

            <View style={[styles.modalIconCircle, { backgroundColor: modal.iconBg || colors.error.main }]}>
              <Icon name={modal.icon} size={ms(28)} color={colors.common.white} />
            </View>

            <Text
              variant="h3"
              style={[styles.modalTitle, { color: themeColors.text.primary }]}
            >
              {modal.title}
            </Text>

            <Text
              variant="body"
              style={[styles.modalMessage, { color: themeColors.text.secondary }]}
            >
              {modal.message}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: themeColors.background,
                    borderWidth: 1,
                    borderColor: themeColors.border,
                  },
                ]}
                onPress={hideModal}
                activeOpacity={0.8}
              >
                <Text
                  variant="body"
                  style={[styles.modalBtnText, { color: themeColors.text.primary }]}
                >
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor:
                      modal.confirmStyle === 'destructive'
                        ? colors.error.main
                        : colors.primary.main,
                  },
                ]}
                onPress={modal.onConfirm}
                activeOpacity={0.8}
              >
                <Text
                  variant="body"
                  style={[styles.modalBtnText, { color: colors.common.white }]}
                >
                  {modal.confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: ms(60),
  },
  emptyList: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(12),
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  swipeDeleteBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: ms(72),
    borderRadius: ms(12),
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  cardIcon: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    alignSelf: 'flex-start',
    marginTop: ms(2),
  },
  cardContent: {
    flex: 1,
    marginRight: spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: ms(4),
    marginTop: ms(4),
  },
  tenantBadge: {
    borderRadius: ms(4),
    paddingHorizontal: ms(6),
    paddingVertical: 2,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  modalHandle: {
    width: ms(40),
    height: ms(4),
    borderRadius: ms(2),
    marginBottom: spacing.xl,
  },
  modalIconCircle: {
    width: ms(60),
    height: ms(60),
    borderRadius: ms(30),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalMessage: {
    textAlign: 'center',
    lineHeight: ms(22),
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: ms(12),
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: ms(48),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: ms(16),
    fontWeight: '600',
  },
});

export default TicketScanHistoryScreen;
