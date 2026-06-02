/** Bottom-sheet list of saved chat threads. */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, Icon, BottomSheet, AlertModal } from '../common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing } from '../../utils/responsive';
import { aiAssistantService } from '../../api/services/aiAssistantService';
import type { ChatThreadSummary } from '../../types/ai-assistant';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentThreadId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

const SKELETON_WIDTHS = ['70%', '55%', '80%', '60%', '72%', '50%'];

const HistorySkeleton: React.FC = () => {
  const theme = useAppTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View>
      {SKELETON_WIDTHS.map((w, i) => (
        <Animated.View
          key={i}
          style={[
            styles.skelRow,
            { backgroundColor: theme.colors.cardElevated, borderColor: theme.colors.border, opacity: pulse },
          ]}
        >
          <View style={[styles.skelDot, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.skelBar, { backgroundColor: theme.colors.border, width: w as any }]} />
        </Animated.View>
      ))}
    </View>
  );
};

export const AiHistorySheet: React.FC<Props> = ({
  visible,
  onClose,
  currentThreadId,
  onSelect,
  onNew,
}) => {
  const theme = useAppTheme();
  const [threads, setThreads] = useState<ChatThreadSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await aiAssistantService.listThreads();
      setThreads(list);
    } catch (e: any) {
      setThreads([]);
      setLoadError(e?.message ?? 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const confirmDelete = (id: string) => setConfirmId(id);

  const performDelete = async () => {
    const id = confirmId;
    if (!id) return;
    try {
      await aiAssistantService.deleteThread(id);
      setThreads((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
    } catch {
      /* ignore */
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Conversations"
      headerIcon="history"
      height="full"
    >
      <TouchableOpacity
        style={[styles.newRow, { borderColor: theme.colors.primary.main }]}
        activeOpacity={0.7}
        onPress={() => {
          onNew();
          onClose();
        }}
      >
        <Icon name="plus-circle-outline" size={ms(18)} color={theme.colors.primary.main} />
        <Text variant="body" color="primary" style={styles.newText}>
          New conversation
        </Text>
      </TouchableOpacity>

      {loading && <HistorySkeleton />}

      {!loading && loadError && (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={ms(34)} color={theme.colors.error.main} />
          <Text variant="bodySmall" color="secondary" style={styles.emptyText} align="center">
            Couldn't load conversations
          </Text>
          <Text variant="caption" color="hint" style={styles.errDetail} align="center">
            {loadError}
          </Text>
          <TouchableOpacity onPress={refresh} style={styles.retryBtn} activeOpacity={0.7}>
            <Icon name="refresh" size={ms(15)} color={theme.colors.primary.main} />
            <Text variant="caption" color="primary" style={styles.retryText}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !loadError && threads?.length === 0 && (
        <View style={styles.center}>
          <Icon name="message-text-outline" size={ms(34)} color={theme.colors.textHint} />
          <Text variant="bodySmall" color="hint" style={styles.emptyText}>
            No conversations yet
          </Text>
        </View>
      )}

      {!loading &&
        threads?.map((t) => {
          const active = t.id === currentThreadId;
          return (
            <View
              key={t.id}
              style={[
                styles.row,
                {
                  backgroundColor: active
                    ? theme.colors.primary.main + '18'
                    : theme.colors.cardElevated,
                  borderColor: active ? theme.colors.primary.main : theme.colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.rowMain}
                activeOpacity={0.7}
                onPress={() => {
                  onSelect(t.id);
                  onClose();
                }}
              >
                <Icon
                  name="chat-outline"
                  size={ms(16)}
                  color={active ? theme.colors.primary.main : theme.colors.textSecondary}
                />
                <Text
                  variant="bodySmall"
                  color="primary"
                  numberOfLines={1}
                  style={styles.title}
                >
                  {t.title || 'Untitled conversation'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(t.id)} hitSlop={styles.hit}>
                <Icon name="trash-can-outline" size={ms(16)} color={theme.colors.textHint} />
              </TouchableOpacity>
            </View>
          );
        })}

      <AlertModal
        visible={!!confirmId}
        type="confirm"
        icon="trash-can-outline"
        title="Delete conversation?"
        message="This conversation and its messages will be permanently removed. This can't be undone."
        buttons={[
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]}
        onClose={() => setConfirmId(null)}
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: ms(12),
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  newText: { marginLeft: spacing.sm, fontWeight: '600' },
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  skelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(12),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    height: ms(50),
  },
  skelDot: { width: ms(16), height: ms(16), borderRadius: ms(8), marginRight: spacing.sm },
  skelBar: { height: ms(10), borderRadius: ms(5) },
  emptyText: { marginTop: spacing.sm },
  errDetail: { marginTop: spacing.xs, paddingHorizontal: spacing.lg },
  retryBtn: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  retryText: { marginLeft: spacing.xs, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(12),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  title: { marginLeft: spacing.sm, flex: 1 },
  hit: { top: 10, bottom: 10, left: 10, right: 10 },
});

export default AiHistorySheet;
