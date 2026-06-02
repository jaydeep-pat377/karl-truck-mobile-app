/** Per-widget comment thread on a saved dashboard. */
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { Text, Icon, BottomSheet } from '../common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing, fontSizes } from '../../utils/responsive';
import { colors } from '../../theme/colors';
import { aiAssistantService } from '../../api/services/aiAssistantService';

interface Props {
  visible: boolean;
  onClose: () => void;
  dashboardId: string;
  widgetId: string;
  widgetTitle?: string;
}

type Comment = { id: string; widget_id: string; user_id: string; body: string; parent_id: string | null; created_at: string };

export const WidgetCommentsSheet: React.FC<Props> = ({ visible, onClose, dashboardId, widgetId, widgetTitle }) => {
  const theme = useAppTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await aiAssistantService.listComments(dashboardId, widgetId);
      setComments(data.comments ?? []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [dashboardId, widgetId]);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const add = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await aiAssistantService.addComment(dashboardId, { widgetId, body });
      setText('');
      await refresh();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to comment', text2: e?.message, position: 'top', topOffset: 50 });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (commentId: string) => {
    try {
      await aiAssistantService.deleteComment(dashboardId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      /* ignore */
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Comments" subtitle={widgetTitle} headerIcon="comment-text-multiple-outline" height="content">
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary.main} />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.center}>
          <Icon name="comment-outline" size={ms(30)} color={theme.colors.textHint} />
          <Text variant="caption" color="hint" style={styles.gap}>No comments yet</Text>
        </View>
      ) : (
        comments.map((c) => (
          <View key={c.id} style={[styles.comment, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardElevated }]}>
            <View style={styles.commentHead}>
              <Icon name="account-circle-outline" size={ms(15)} color={theme.colors.textSecondary} />
              <Text variant="captionSmall" color="hint" style={styles.who}>
                {c.user_id.slice(0, 8)}… · {new Date(c.created_at).toLocaleDateString()}
              </Text>
              <TouchableOpacity onPress={() => remove(c.id)} hitSlop={styles.hit}>
                <Icon name="trash-can-outline" size={ms(14)} color={theme.colors.textHint} />
              </TouchableOpacity>
            </View>
            <Text variant="bodySmall" color="primary" style={styles.body}>{c.body}</Text>
          </View>
        ))
      )}

      <View style={styles.composer}>
        <TextInput
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.cardElevated }]}
          value={text}
          onChangeText={setText}
          placeholder="Add a comment…"
          placeholderTextColor={theme.colors.textHint}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: text.trim() && !busy ? colors.primary.main : theme.colors.border }]}
          onPress={add}
          disabled={!text.trim() || busy}
        >
          {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="send" size={ms(16)} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  gap: { marginTop: spacing.sm },
  comment: { borderWidth: StyleSheet.hairlineWidth, borderRadius: ms(10), padding: spacing.md, marginBottom: spacing.sm },
  commentHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  who: { flex: 1, marginLeft: spacing.xs },
  body: {},
  hit: { top: 8, bottom: 8, left: 8, right: 8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(12),
    paddingHorizontal: spacing.md,
    paddingVertical: ms(8),
    fontSize: fontSizes.md,
    maxHeight: ms(100),
  },
  sendBtn: { width: ms(40), height: ms(40), borderRadius: ms(20), alignItems: 'center', justifyContent: 'center' },
});

export default WidgetCommentsSheet;
