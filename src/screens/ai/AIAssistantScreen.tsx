/**
 * AI Assistant — full-screen chat with a collapsible dashboard bottom sheet.
 * Mirrors the web "AI Assistant" feature, adapted for mobile.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Text, Icon } from '../../components/common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing } from '../../utils/responsive';
import { colors } from '../../theme/colors';
import { useAiChat } from '../../hooks/useAiChat';
import { getModelDef, TIER_COLOR } from '../../lib/ai/models';
import Toast from 'react-native-toast-message';
import {
  AiChatMessage,
  AiChatInput,
  AiSuggestions,
  AiFollowUpChips,
  AiModelSelector,
  AiHistorySheet,
  DashboardSheet,
  SavedDashboardsSheet,
} from '../../components/ai-assistant';
import { aiAssistantService } from '../../api/services/aiAssistantService';
import type {
  AiChatMessage as AiMessage,
  SavedDashboardFull,
} from '../../types/ai-assistant';
import type { RootStackParamList } from '../../navigation/types';

type ScreenRoute = RouteProp<RootStackParamList, 'AIAssistant'>;

export const AIAssistantScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ScreenRoute>();

  const {
    messages,
    status,
    modelId,
    threadId,
    dashboard,
    insights,
    followUps,
    error,
    saveError,
    loadingThread,
    send,
    stop,
    newChat,
    loadThread,
    setModelId,
    retrySave,
    showDashboard,
  } = useAiChat();

  const [modelOpen, setModelOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // id of the saved dashboard currently being viewed (enables comments);
  // null when viewing a freshly-generated/unsaved dashboard.
  const [savedDashboardId, setSavedDashboardId] = useState<string | null>(null);

  // A new chat turn replaces the dashboard, so it's no longer the saved one.
  useEffect(() => {
    if (status === 'submitted') setSavedDashboardId(null);
  }, [status]);
  const listRef = useRef<FlatList<AiMessage>>(null);
  const busy = status !== 'idle';
  const model = getModelDef(modelId);

  const handleSaveDashboard = useCallback(async () => {
    if (!dashboard || saving) return;
    setSaving(true);
    try {
      await aiAssistantService.saveDashboard({
        title: dashboard.title || 'Dashboard',
        widgets: dashboard.widgets,
        threadId,
      });
      Toast.show({ type: 'success', text1: 'Dashboard saved', position: 'top', topOffset: 50 });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: e?.message,
        position: 'top',
        topOffset: 50,
      });
    } finally {
      setSaving(false);
    }
  }, [dashboard, saving, threadId]);

  const handleOpenSaved = useCallback(
    (d: SavedDashboardFull) => {
      showDashboard({ title: d.title || 'Dashboard', widgets: d.widgets });
      setSavedDashboardId(d.id);
      setDashOpen(true);
    },
    [showDashboard],
  );

  const handleNewChat = useCallback(() => {
    setSavedDashboardId(null);
    newChat();
  }, [newChat]);

  // Optional: auto-send an initial message passed via navigation params.
  const initialSentRef = useRef(false);
  useEffect(() => {
    const initial = route.params?.initialMessage;
    if (initial && !initialSentRef.current && status === 'idle' && messages.length === 0) {
      initialSentRef.current = true;
      send(initial);
    }
  }, [route.params, status, messages.length, send]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: AiMessage; index: number }) => {
      const isLast = index === messages.length - 1;
      const streaming = busy && isLast && item.role === 'assistant';
      return <AiChatMessage message={item} isStreaming={streaming} modelId={modelId} />;
    },
    [messages.length, busy, modelId],
  );

  const keyExtractor = useCallback((m: AiMessage) => m.id, []);

  const headerBtn = (icon: string, onPress: () => void, label: string, badge?: boolean) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.headerBtn, { backgroundColor: theme.colors.cardElevated }]}
      activeOpacity={0.7}
      accessibilityLabel={label}
    >
      <Icon name={icon} size={ms(18)} color={theme.colors.text} />
      {badge && <View style={[styles.badge, { backgroundColor: colors.primary.main }]} />}
    </TouchableOpacity>
  );

  const showDashButton = dashboard != null;

  const ListEmpty = useMemo(
    () =>
      loadingThread ? (
        <View style={styles.loadingThread}>
          <ActivityIndicator color={theme.colors.primary.main} />
          <Text variant="caption" color="hint" style={styles.loadingText}>
            Loading conversation…
          </Text>
        </View>
      ) : (
        <AiSuggestions onPick={send} />
      ),
    [loadingThread, send, theme.colors.primary.main],
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <Icon name="arrow-left" size={ms(22)} color={theme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modelChip, { backgroundColor: theme.colors.cardElevated }]}
          activeOpacity={0.7}
          onPress={() => setModelOpen(true)}
        >
          <View style={[styles.modelDot, { backgroundColor: model.color ?? TIER_COLOR[model.tier] }]} />
          <Text variant="caption" color="primary" numberOfLines={1} style={styles.modelLabel}>
            {model.label}
          </Text>
          <Icon name="chevron-down" size={ms(14)} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {headerBtn('plus', handleNewChat, 'New chat')}
          {headerBtn('bookmark-multiple-outline', () => setSavedOpen(true), 'Saved dashboards')}
          {headerBtn('history', () => setHistoryOpen(true), 'History', !!threadId)}
          {headerBtn('cog-outline', () => (navigation as any).navigate('AISettings'), 'AI settings')}
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={ListEmpty}
          onContentSizeChange={busy ? scrollToEnd : undefined}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {/* Error / save banners */}
        {!!error && (
          /no api key/i.test(error) ? (
            // Missing-key error: show inline setup instructions + a shortcut to
            // AI Settings, so the user can fix it without leaving the chat.
            <View style={[styles.keyHelp, { backgroundColor: theme.colors.error.background, borderColor: colors.error.main }]}>
              <View style={styles.keyHelpRow}>
                <Icon name="key-alert-outline" size={ms(16)} color={colors.error.main} />
                <Text variant="caption" style={[styles.bannerText, { color: colors.error.dark }]}>
                  {error}
                </Text>
              </View>
              <Text variant="captionSmall" color="secondary" style={styles.keyHelpSteps}>
                To set up your API key: tap “Open AI settings” → under Provider API keys, paste your key for this model’s provider → Save. Then ask your question again. (Or pick a different model you already have a key for.)
              </Text>
              <TouchableOpacity
                style={[styles.keyHelpBtn, { backgroundColor: colors.primary.main }]}
                onPress={() => (navigation as any).navigate('AISettings')}
                activeOpacity={0.85}
              >
                <Icon name="cog-outline" size={ms(14)} color="#FFFFFF" />
                <Text variant="caption" color="white" style={styles.keyHelpBtnText}>Open AI settings</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.banner, { backgroundColor: theme.colors.error.background }]}>
              <Icon name="alert-circle-outline" size={ms(16)} color={colors.error.main} />
              <Text variant="caption" style={[styles.bannerText, { color: colors.error.dark }]}>
                {error}
              </Text>
            </View>
          )
        )}
        {saveError && (
          <TouchableOpacity
            style={[styles.banner, { backgroundColor: theme.colors.warning.background }]}
            onPress={retrySave}
            activeOpacity={0.7}
          >
            <Icon name="cloud-off-outline" size={ms(16)} color={colors.warning.dark} />
            <Text variant="caption" style={[styles.bannerText, { color: colors.warning.dark }]}>
              Chat not saved — tap to retry
            </Text>
          </TouchableOpacity>
        )}

        {/* Bottom composer area: dashboard pill → follow-ups → input */}
        <View style={styles.bottomArea}>
          {showDashButton && (
            <TouchableOpacity
              style={[styles.dashPill, { backgroundColor: colors.primary.main }]}
              activeOpacity={0.85}
              onPress={() => setDashOpen(true)}
            >
              <Icon name="view-dashboard-outline" size={ms(16)} color="#FFFFFF" />
              <Text variant="caption" color="white" style={styles.dashPillText}>
                View dashboard
              </Text>
              {insights.length > 0 && (
                <View style={styles.dashPillBadge}>
                  <Text variant="captionSmall" color="white" style={styles.dashPillBadgeText}>
                    {insights.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {followUps.length > 0 && !busy && (
            <AiFollowUpChips followUps={followUps} onPick={send} disabled={busy} />
          )}

          <AiChatInput onSend={send} onStop={stop} busy={busy} />
          <View style={{ height: insets.bottom > 0 ? insets.bottom : spacing.sm }} />
        </View>
      </KeyboardAvoidingView>

      <AiModelSelector
        visible={modelOpen}
        onClose={() => setModelOpen(false)}
        value={modelId}
        onChange={setModelId}
      />
      <AiHistorySheet
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        currentThreadId={threadId}
        onSelect={loadThread}
        onNew={handleNewChat}
      />
      <DashboardSheet
        visible={dashOpen}
        onClose={() => setDashOpen(false)}
        dashboard={dashboard}
        insights={insights}
        onSave={handleSaveDashboard}
        saving={saving}
        dashboardId={savedDashboardId}
      />
      <SavedDashboardsSheet
        visible={savedOpen}
        onClose={() => setSavedOpen(false)}
        onOpen={handleOpenSaved}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  backBtn: { padding: ms(4) },
  modelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(16),
    paddingHorizontal: spacing.md,
    paddingVertical: ms(6),
    alignSelf: 'center',
    maxWidth: ms(220),
  },
  modelDot: { width: ms(8), height: ms(8), borderRadius: ms(4), marginRight: spacing.xs },
  modelLabel: { flexShrink: 1, marginRight: spacing.xs },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: 'auto' },
  headerBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: ms(7),
    right: ms(7),
    width: ms(7),
    height: ms(7),
    borderRadius: ms(4),
  },
  listContent: { padding: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 },
  loadingThread: { alignItems: 'center', paddingTop: spacing.xxl },
  loadingText: { marginTop: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: ms(10),
  },
  bannerText: { marginLeft: spacing.sm, flex: 1 },
  keyHelp: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: ms(10),
    borderWidth: StyleSheet.hairlineWidth,
  },
  keyHelpRow: { flexDirection: 'row', alignItems: 'center' },
  keyHelpSteps: { marginTop: spacing.xs, lineHeight: ms(17) },
  keyHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: ms(6),
    borderRadius: ms(16),
  },
  keyHelpBtnText: { marginLeft: spacing.xs, fontWeight: '600' },
  bottomArea: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  dashPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(20),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  dashPillText: { marginLeft: spacing.xs, fontWeight: '600' },
  dashPillBadge: {
    marginLeft: spacing.xs,
    minWidth: ms(16),
    height: ms(16),
    borderRadius: ms(8),
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(4),
  },
  dashPillBadgeText: { fontWeight: '700' },
});

export default AIAssistantScreen;
