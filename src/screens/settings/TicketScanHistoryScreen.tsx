import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Card, Icon } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { STORAGE_KEYS } from '../../utils/storage';
import { TicketScanRecord } from './TicketScanScreen';

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
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
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const TicketScanHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const [history, setHistory] = useState<TicketScanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const historyStr = await AsyncStorage.getItem(STORAGE_KEYS.TICKET_SCAN_HISTORY);
      const data: TicketScanRecord[] = historyStr ? JSON.parse(historyStr) : [];
      setHistory(data);
    } catch (error) {
      console.error('[TicketScanHistory] Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all scan history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(STORAGE_KEYS.TICKET_SCAN_HISTORY);
            setHistory([]);
          },
        },
      ],
    );
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert(
      'Delete Record',
      'Remove this scan from history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = history.filter(item => item.id !== id);
            setHistory(updated);
            await AsyncStorage.setItem(
              STORAGE_KEYS.TICKET_SCAN_HISTORY,
              JSON.stringify(updated)
            );
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: TicketScanRecord }) => (
    <Card padding="none" style={styles.itemCard}>
      <TouchableOpacity
        style={styles.itemContainer}
        activeOpacity={0.7}
        onLongPress={() => handleDeleteItem(item.id)}
      >
        <View style={[styles.itemIcon, { backgroundColor: colors.primary.main + '15' }]}>
          <Icon name="qrcode-scan" size={ms(20)} color={colors.primary.main} />
        </View>
        <View style={styles.itemContent}>
          <Text variant="bodySmall" style={{ fontWeight: '600' }}>
            {item.ticketCode || 'Unknown Ticket'}
          </Text>
          {item.orderCode && (
            <Text variant="caption" color="secondary">
              Order: {item.orderCode}
            </Text>
          )}
          <Text variant="caption" color="hint">
            {formatDate(item.scannedAt)}
          </Text>
        </View>
        <Icon name="chevron-right" size={ms(18)} color={themeColors.text.hint} />
      </TouchableOpacity>
    </Card>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: themeColors.surface }]}>
          <Icon name="qrcode-scan" size={ms(40)} color={themeColors.text.hint} />
        </View>
        <Text variant="body" color="secondary" style={styles.emptyTitle}>
          No Scan History
        </Text>
        <Text variant="caption" color="hint" style={styles.emptySubtitle}>
          Scanned tickets will appear here
        </Text>
      </View>
    );
  };

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
        <Text variant="h2">Scan History</Text>
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

      {/* Scan count */}
      {history.length > 0 && (
        <View style={styles.countContainer}>
          <Text variant="caption" color="secondary">
            {history.length} scan{history.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* History List */}
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          history.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadHistory}
            tintColor={colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  countContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  itemCard: {
    overflow: 'hidden',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(12),
    paddingHorizontal: ms(14),
  },
  itemIcon: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: spacing.md,
    gap: ms(2),
  },
  separator: {
    height: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyTitle: {
    fontWeight: '600',
    marginBottom: ms(4),
  },
  emptySubtitle: {
    textAlign: 'center',
  },
});

export default TicketScanHistoryScreen;
