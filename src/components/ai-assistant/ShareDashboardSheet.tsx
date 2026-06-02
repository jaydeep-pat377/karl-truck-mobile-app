/** Share a saved dashboard: invite users by email + public link toggle. */
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { Text, Icon, BottomSheet } from '../common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing, fontSizes } from '../../utils/responsive';
import { colors } from '../../theme/colors';
import { aiAssistantService } from '../../api/services/aiAssistantService';

interface Props {
  visible: boolean;
  onClose: () => void;
  dashboardId: string | null;
  dashboardTitle?: string | null;
}

type ShareInfo = {
  shares: Array<{ id: string; shared_with_user_id: string; created_at: string }>;
  publicToken: string | null;
  isPublic: boolean;
};

export const ShareDashboardSheet: React.FC<Props> = ({ visible, onClose, dashboardId, dashboardTitle }) => {
  const theme = useAppTheme();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!dashboardId) return;
    setLoading(true);
    try {
      setInfo(await aiAssistantService.getShareInfo(dashboardId));
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to load sharing', text2: e?.message, position: 'top', topOffset: 50 });
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    if (visible && dashboardId) refresh();
  }, [visible, dashboardId, refresh]);

  const run = async (fn: () => Promise<any>, successMsg?: string) => {
    if (!dashboardId || busy) return;
    setBusy(true);
    try {
      await fn();
      if (successMsg) Toast.show({ type: 'success', text1: successMsg, position: 'top', topOffset: 50 });
      await refresh();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Action failed', text2: e?.message, position: 'top', topOffset: 50 });
    } finally {
      setBusy(false);
    }
  };

  const invite = () => {
    const e = email.trim();
    if (!e.includes('@')) return;
    run(() => aiAssistantService.applyShare(dashboardId!, { action: 'invite', email: e }), 'Invited').then(() => setEmail(''));
  };

  const copyToken = () => {
    if (!info?.publicToken) return;
    Clipboard.setString(info.publicToken);
    Toast.show({ type: 'success', text1: 'Public token copied', position: 'top', topOffset: 50 });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Share dashboard" subtitle={dashboardTitle ?? undefined} headerIcon="share-variant" height="content">
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary.main} />
        </View>
      )}

      {!loading && (
        <>
          {/* Invite by email */}
          <Text variant="captionSmall" color="hint" style={styles.label}>INVITE BY EMAIL</Text>
          <View style={styles.inviteRow}>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.cardElevated }]}
              value={email}
              onChangeText={setEmail}
              placeholder="user@company.com"
              placeholderTextColor={theme.colors.textHint}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.inviteBtn, { backgroundColor: colors.primary.main, opacity: email.includes('@') && !busy ? 1 : 0.5 }]}
              onPress={invite}
              disabled={!email.includes('@') || busy}
            >
              <Text variant="caption" color="white" style={styles.bold}>Invite</Text>
            </TouchableOpacity>
          </View>

          {/* Public link */}
          <Text variant="captionSmall" color="hint" style={styles.label}>PUBLIC LINK</Text>
          {info?.isPublic && info.publicToken ? (
            <View style={[styles.publicBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardElevated }]}>
              <Text variant="caption" color="secondary" numberOfLines={1} style={styles.token}>{info.publicToken}</Text>
              <TouchableOpacity onPress={copyToken} hitSlop={styles.hit} style={styles.iconBtn}>
                <Icon name="content-copy" size={ms(16)} color={theme.colors.primary.main} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => run(() => aiAssistantService.applyShare(dashboardId!, { action: 'revokeLink' }), 'Public link revoked')} hitSlop={styles.hit} style={styles.iconBtn}>
                <Icon name="link-off" size={ms(16)} color={theme.colors.error.main} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.genBtn, { borderColor: theme.colors.primary.main }]}
              onPress={() => run(() => aiAssistantService.applyShare(dashboardId!, { action: 'generateLink' }), 'Public link created')}
              disabled={busy}
            >
              <Icon name="link-variant" size={ms(15)} color={theme.colors.primary.main} />
              <Text variant="caption" color="primary" style={styles.genText}>Generate public link</Text>
            </TouchableOpacity>
          )}

          {/* Current shares */}
          <Text variant="captionSmall" color="hint" style={styles.label}>SHARED WITH ({info?.shares.length ?? 0})</Text>
          {(info?.shares ?? []).length === 0 ? (
            <Text variant="caption" color="hint">Not shared with anyone yet.</Text>
          ) : (
            (info?.shares ?? []).map((s) => (
              <View key={s.id} style={[styles.shareRow, { borderColor: theme.colors.border }]}>
                <Icon name="account-outline" size={ms(16)} color={theme.colors.textSecondary} />
                <Text variant="caption" color="primary" numberOfLines={1} style={styles.shareId}>
                  {s.shared_with_user_id.slice(0, 8)}…
                </Text>
                <TouchableOpacity onPress={() => run(() => aiAssistantService.revokeShare(dashboardId!, s.shared_with_user_id), 'Revoked')} hitSlop={styles.hit}>
                  <Icon name="close-circle-outline" size={ms(16)} color={theme.colors.textHint} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  label: { letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.xs },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(10),
    paddingHorizontal: spacing.md,
    paddingVertical: ms(9),
    fontSize: fontSizes.md,
  },
  inviteBtn: { borderRadius: ms(10), paddingHorizontal: spacing.lg, paddingVertical: ms(10) },
  bold: { fontWeight: '600' },
  publicBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(10),
    paddingHorizontal: spacing.md,
    paddingVertical: ms(8),
  },
  token: { flex: 1, fontFamily: 'monospace' as any },
  iconBtn: { padding: ms(4), marginLeft: spacing.xs },
  hit: { top: 10, bottom: 10, left: 10, right: 10 },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: ms(10),
    padding: spacing.md,
    justifyContent: 'center',
  },
  genText: { marginLeft: spacing.xs, fontWeight: '600' },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(10),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  shareId: { flex: 1, fontFamily: 'monospace' as any },
});

export default ShareDashboardSheet;
