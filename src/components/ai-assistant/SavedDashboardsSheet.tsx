/** Bottom-sheet list of saved & shared dashboards. */
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Icon, BottomSheet, AlertModal } from '../common';
import { ShareDashboardSheet } from './ShareDashboardSheet';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing } from '../../utils/responsive';
import { aiAssistantService } from '../../api/services/aiAssistantService';
import type {
  SavedDashboardSummary,
  SharedDashboardRow,
  SavedDashboardFull,
} from '../../types/ai-assistant';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpen: (dashboard: SavedDashboardFull) => void;
}

export const SavedDashboardsSheet: React.FC<Props> = ({ visible, onClose, onOpen }) => {
  const theme = useAppTheme();
  const [owned, setOwned] = useState<SavedDashboardSummary[]>([]);
  const [shared, setShared] = useState<SharedDashboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<{ id: string; title: string | null } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiAssistantService.listDashboards();
      setOwned(data.owned ?? []);
      setShared(data.shared ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load dashboards');
      setOwned([]);
      setShared([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const open = async (id: string) => {
    setOpeningId(id);
    try {
      const full = await aiAssistantService.getDashboard(id);
      if (full) {
        onOpen(full);
        onClose();
      }
    } catch {
      /* ignore */
    } finally {
      setOpeningId(null);
    }
  };

  const performDelete = async () => {
    const id = confirmId;
    if (!id) return;
    try {
      await aiAssistantService.deleteDashboard(id);
      setOwned((prev) => prev.filter((d) => d.id !== id));
    } catch {
      /* ignore */
    }
  };

  const Row = ({
    id,
    title,
    canDelete,
  }: {
    id: string;
    title: string | null;
    canDelete: boolean;
  }) => (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.colors.cardElevated, borderColor: theme.colors.border },
      ]}
    >
      <TouchableOpacity style={styles.rowMain} activeOpacity={0.7} onPress={() => open(id)}>
        <Icon
          name="view-dashboard-outline"
          size={ms(16)}
          color={theme.colors.primary.main}
        />
        <Text variant="bodySmall" color="primary" numberOfLines={1} style={styles.title}>
          {title || 'Untitled dashboard'}
        </Text>
        {openingId === id && (
          <ActivityIndicator size="small" color={theme.colors.textHint} />
        )}
      </TouchableOpacity>
      {canDelete && (
        <TouchableOpacity
          onPress={() => setShareTarget({ id, title })}
          hitSlop={styles.hit}
          style={styles.rowAction}
        >
          <Icon name="share-variant-outline" size={ms(16)} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
      {canDelete && (
        <TouchableOpacity onPress={() => setConfirmId(id)} hitSlop={styles.hit} style={styles.rowAction}>
          <Icon name="trash-can-outline" size={ms(16)} color={theme.colors.textHint} />
        </TouchableOpacity>
      )}
    </View>
  );

  const isEmpty = !loading && !error && owned.length === 0 && shared.length === 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Saved dashboards"
      headerIcon="view-dashboard-variant-outline"
      height="full"
    >
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary.main} />
          <Text variant="caption" color="hint" style={styles.gap}>
            Loading dashboards…
          </Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={ms(30)} color={theme.colors.error.main} />
          <Text variant="caption" color="hint" align="center" style={styles.gap}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Icon name="refresh" size={ms(15)} color={theme.colors.primary.main} />
            <Text variant="caption" color="primary" style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {isEmpty && (
        <View style={styles.center}>
          <Icon name="bookmark-outline" size={ms(34)} color={theme.colors.textHint} />
          <Text variant="bodySmall" color="hint" style={styles.gap}>
            No saved dashboards yet
          </Text>
          <Text variant="caption" color="hint" align="center" style={styles.subtle}>
            Generate a dashboard in chat, then tap Save.
          </Text>
        </View>
      )}

      {!loading && owned.length > 0 && (
        <>
          <Text variant="captionSmall" color="hint" style={styles.section}>
            YOURS
          </Text>
          {owned.map((d) => (
            <Row key={d.id} id={d.id} title={d.title} canDelete />
          ))}
        </>
      )}

      {!loading && shared.length > 0 && (
        <>
          <Text variant="captionSmall" color="hint" style={styles.section}>
            SHARED WITH YOU
          </Text>
          {shared.map((s) => (
            <Row
              key={s.dashboard_id}
              id={s.ai_dashboards?.id ?? s.dashboard_id}
              title={s.ai_dashboards?.title ?? null}
              canDelete={false}
            />
          ))}
        </>
      )}

      <AlertModal
        visible={!!confirmId}
        type="confirm"
        icon="trash-can-outline"
        title="Delete dashboard?"
        message="This saved dashboard will be permanently removed. This can't be undone."
        buttons={[
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]}
        onClose={() => setConfirmId(null)}
      />

      <ShareDashboardSheet
        visible={!!shareTarget}
        onClose={() => setShareTarget(null)}
        dashboardId={shareTarget?.id ?? null}
        dashboardTitle={shareTarget?.title}
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  gap: { marginTop: spacing.sm },
  subtle: { marginTop: spacing.xs, paddingHorizontal: spacing.lg },
  section: { letterSpacing: 0.5, marginTop: spacing.sm, marginBottom: spacing.xs, marginLeft: spacing.xs },
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
  rowAction: { marginLeft: spacing.sm },
  title: { marginLeft: spacing.sm, flex: 1 },
  hit: { top: 10, bottom: 10, left: 10, right: 10 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  retryText: { marginLeft: spacing.xs, fontWeight: '600' },
});

export default SavedDashboardsSheet;
