import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export const TicketScanHistoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<SettingsStackParamList>>();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const currentPage = useRef(1);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const closeSwipeable = useCallback((id: string) => {
    swipeableRefs.current.get(id)?.close();
  }, []);

  const handleDeleteItem = useCallback(
    (item: ScanRecord) => {
      closeSwipeable(item.id);
      Alert.alert(t('scanHistory.deleteScan'), t('scanHistory.deleteScanConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteScanRecord(item.id);
            setHistory(prev => prev.filter(h => h.id !== item.id));
            if (pagination) {
              setPagination(p => p ? { ...p, total: p.total - 1 } : null);
            }
          },
        },
      ]);
    },
    [closeSwipeable, pagination, t],
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
    Alert.alert(t('scanHistory.clearHistory'), t('scanHistory.clearHistoryConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('scanHistory.clearAll'),
        style: 'destructive',
        onPress: async () => {
          await clearScanHistory();
          setHistory([]);
          setPagination(null);
        },
      },
    ]);
  }, [t]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
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
});

export default TicketScanHistoryScreen;
