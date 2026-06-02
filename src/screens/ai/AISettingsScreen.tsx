/**
 * AI settings (admin) — full parity with the web "Truckast AI configuration":
 * model selection + default, per-tenant token bank (allotment / enforce /
 * top-up + usage bar), provider API keys, and usage analytics.
 *
 * Admin-gated: the backend returns isAdmin and rejects PUT for non-admins.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Text, Icon } from '../../components/common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing, fontSizes } from '../../utils/responsive';
import { colors } from '../../theme/colors';
import { MODELS, TIER_COLOR } from '../../lib/ai/models';
import { aiAssistantService } from '../../api/services/aiAssistantService';
import type {
  AiConfigPayload,
  AiUsagePayload,
  ProviderKeyStatus,
} from '../../types/ai-assistant';

const fmt = (n: number) => Math.round(n).toLocaleString();

type KeyFields = {
  googleApiKey: string;
  anthropicApiKey: string;
  azureApiKey: string;
  azureResourceName: string;
  azureDeployment: string;
};
const EMPTY_KEYS: KeyFields = {
  googleApiKey: '',
  anthropicApiKey: '',
  azureApiKey: '',
  azureResourceName: '',
  azureDeployment: '',
};

export const AISettingsScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [payload, setPayload] = useState<AiConfigPayload | null>(null);
  const [usage, setUsage] = useState<AiUsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingTokens, setAddingTokens] = useState(false);

  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [defaultId, setDefaultId] = useState('');
  const [allotment, setAllotment] = useState('');
  const [enforced, setEnforced] = useState(false);
  const [topup, setTopup] = useState('');
  const [keys, setKeys] = useState<KeyFields>(EMPTY_KEYS);

  const hydrate = useCallback((p: AiConfigPayload) => {
    setEnabled(new Set(p.config.enabledModelIds));
    setDefaultId(p.config.defaultModelId);
    setEnforced(p.tokenBank?.enforced ?? false);
    setAllotment(
      p.tokenBank?.monthlyAllotment != null ? String(p.tokenBank.monthlyAllotment) : '',
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await aiAssistantService.getConfig();
      setPayload(p);
      hydrate(p);
      if (p.isAdmin) {
        aiAssistantService.getConfigUsage().then(setUsage).catch(() => {});
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useEffect(() => {
    load();
  }, [load]);

  const isAdmin = payload?.isAdmin;
  const bank = payload?.tokenBank;

  const toggleModel = (id: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev; // keep at least one
        next.delete(id);
        if (defaultId === id) {
          const first = [...next][0];
          if (first) setDefaultId(first);
        }
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const buildKeyUpdate = () => {
    const pk: Record<string, string> = {};
    (Object.keys(keys) as (keyof KeyFields)[]).forEach((k) => {
      if (keys[k].trim()) pk[k] = keys[k].trim();
    });
    return Object.keys(pk).length ? pk : undefined;
  };

  const save = async () => {
    if (!isAdmin || saving) return;
    setSaving(true);
    try {
      await aiAssistantService.updateConfig({
        enabledModelIds: [...enabled],
        defaultModelId: defaultId,
        tokenBank: {
          monthlyAllotment: allotment.trim() === '' ? null : Number(allotment),
          enforced,
        },
        providerKeys: buildKeyUpdate(),
      });
      setKeys(EMPTY_KEYS);
      Toast.show({ type: 'success', text1: 'Settings saved', position: 'top', topOffset: 50 });
      await load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: e?.message, position: 'top', topOffset: 50 });
    } finally {
      setSaving(false);
    }
  };

  const addTokens = async () => {
    const n = Number(topup);
    if (!n || n <= 0 || addingTokens) return;
    setAddingTokens(true);
    try {
      await aiAssistantService.updateConfig({ addTokens: Math.floor(n) });
      setTopup('');
      Toast.show({ type: 'success', text1: `Added ${fmt(n)} tokens`, position: 'top', topOffset: 50 });
      await load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Top-up failed', text2: e?.message, position: 'top', topOffset: 50 });
    } finally {
      setAddingTokens(false);
    }
  };

  const usedPct = useMemo(() => {
    if (!bank || bank.unlimited || !bank.startedWith) return 0;
    return Math.min(100, (bank.used / bank.startedWith) * 100);
  }, [bank]);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Back">
          <Icon name="arrow-left" size={ms(22)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text variant="h4" color="primary" style={styles.headerTitle}>
          AI settings
        </Text>
        {isAdmin && (
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary.main }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="content-save-outline" size={ms(15)} color="#FFFFFF" />
            )}
            <Text variant="caption" color="white" style={styles.saveText}>
              Save
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary.main} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={ms(34)} color={theme.colors.error.main} />
          <Text variant="bodySmall" color="hint" align="center" style={styles.gap}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Icon name="refresh" size={ms(15)} color={theme.colors.primary.main} />
            <Text variant="caption" color="primary" style={styles.saveText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !isAdmin ? (
        <View style={styles.center}>
          <Icon name="shield-lock-outline" size={ms(40)} color={theme.colors.textHint} />
          <Text variant="body" color="secondary" align="center" style={styles.gap}>
            Admin access required
          </Text>
          <Text variant="caption" color="hint" align="center" style={styles.subtle}>
            AI configuration can only be changed by an administrator.
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + ms(40) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Model selection */}
            <Section theme={theme} title="Model selection" subtitle="Enable models and choose the default.">
              {MODELS.map((m) => {
                const on = enabled.has(m.id);
                const isDefault = defaultId === m.id;
                const tint = m.color ?? TIER_COLOR[m.tier];
                return (
                  <View
                    key={m.id}
                    style={[styles.modelRow, { backgroundColor: theme.colors.cardElevated, borderColor: theme.colors.border }]}
                  >
                    <View style={[styles.dot, { backgroundColor: tint }]} />
                    <View style={styles.modelInfo}>
                      <Text variant="bodySmall" color="primary" style={styles.bold}>{m.label}</Text>
                      <Text variant="captionSmall" color="hint">{m.tagline}</Text>
                    </View>
                    {on &&
                      (isDefault ? (
                        <View style={[styles.defaultBadge, { backgroundColor: colors.primary.main + '22' }]}>
                          <Text variant="captionSmall" color="primary" style={styles.bold}>Default</Text>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => setDefaultId(m.id)} style={styles.setDefaultBtn}>
                          <Text variant="captionSmall" color="secondary">Set default</Text>
                        </TouchableOpacity>
                      ))}
                    <Switch
                      value={on}
                      onValueChange={() => toggleModel(m.id)}
                      trackColor={{ true: colors.primary.main, false: theme.colors.border }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                );
              })}
            </Section>

            {/* Token bank */}
            <Section theme={theme} title="Token bank" subtitle="Monthly allotment + admin top-ups. Queries are blocked at zero balance when enforced.">
              {bank && !bank.unlimited ? (
                <>
                  <View style={styles.statsRow}>
                    <Stat theme={theme} label="Started with" value={fmt(bank.startedWith)} />
                    <Stat theme={theme} label="Used" value={fmt(bank.used)} />
                    <Stat theme={theme} label="Remaining" value={fmt(bank.remaining)} accent />
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: theme.colors.border }]}>
                    <View style={[styles.barFill, { width: `${usedPct}%`, backgroundColor: colors.primary.main }]} />
                  </View>
                  <Text variant="captionSmall" color="hint" style={styles.barLabel}>
                    {fmt(bank.remaining)} of {fmt(bank.startedWith)} tokens remaining
                  </Text>
                </>
              ) : (
                <Text variant="caption" color="hint">No monthly limit set (unlimited).</Text>
              )}

              <Label theme={theme}>Monthly allotment (blank = unlimited)</Label>
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.cardElevated }]}
                value={allotment}
                onChangeText={setAllotment}
                keyboardType="number-pad"
                placeholder="e.g. 500000"
                placeholderTextColor={theme.colors.textHint}
              />

              <View style={styles.switchRow}>
                <Text variant="bodySmall" color="primary">Enforce balance</Text>
                <Switch
                  value={enforced}
                  onValueChange={setEnforced}
                  trackColor={{ true: colors.primary.main, false: theme.colors.border }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Label theme={theme}>Top up (adds to this month immediately)</Label>
              <View style={styles.topupRow}>
                <TextInput
                  style={[styles.input, styles.flex, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.cardElevated }]}
                  value={topup}
                  onChangeText={setTopup}
                  keyboardType="number-pad"
                  placeholder="e.g. 100000"
                  placeholderTextColor={theme.colors.textHint}
                />
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary.main, opacity: Number(topup) > 0 ? 1 : 0.5 }]}
                  onPress={addTokens}
                  disabled={!(Number(topup) > 0) || addingTokens}
                >
                  {addingTokens ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text variant="caption" color="white" style={styles.bold}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Section>

            {/* Provider API keys */}
            <Section theme={theme} title="Provider API keys" subtitle="Stored encrypted. Leave a field blank to keep the current value.">
              <KeyField theme={theme} label="Google Generative AI key" status={payload?.keyStatus?.google} value={keys.googleApiKey} onChange={(v) => setKeys((k) => ({ ...k, googleApiKey: v }))} secure />
              <KeyField theme={theme} label="Anthropic API key" status={payload?.keyStatus?.anthropic} value={keys.anthropicApiKey} onChange={(v) => setKeys((k) => ({ ...k, anthropicApiKey: v }))} secure />
              <KeyField theme={theme} label="Azure OpenAI key" status={payload?.keyStatus?.azureApiKey} value={keys.azureApiKey} onChange={(v) => setKeys((k) => ({ ...k, azureApiKey: v }))} secure />
              <KeyField theme={theme} label="Azure resource name" status={payload?.keyStatus?.azureResourceName} value={keys.azureResourceName} onChange={(v) => setKeys((k) => ({ ...k, azureResourceName: v }))} />
              <KeyField theme={theme} label="Azure deployment" status={payload?.keyStatus?.azureDeployment} value={keys.azureDeployment} onChange={(v) => setKeys((k) => ({ ...k, azureDeployment: v }))} />
            </Section>

            {/* Usage */}
            {usage && (
              <Section theme={theme} title="Usage (last 30 days)" subtitle="">
                <View style={styles.statsRow}>
                  <Stat theme={theme} label="Tokens" value={fmt(usage.totals.tokens)} />
                  <Stat theme={theme} label="Queries" value={fmt(usage.totals.queries)} />
                  <Stat theme={theme} label="Cost" value={`$${usage.totals.cost.toFixed(2)}`} accent />
                </View>
                {usage.byModel.map((m) => (
                  <View key={m.modelId} style={styles.usageRow}>
                    <Text variant="caption" color="primary" numberOfLines={1} style={styles.flex}>{m.label}</Text>
                    <Text variant="caption" color="secondary">{fmt(m.tokens)} tok · {m.queries}q</Text>
                  </View>
                ))}
              </Section>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

/* ---- small presentational helpers ---- */
const Section = ({ theme, title, subtitle, children }: any) => (
  <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
    <Text variant="h4" color="primary">{title}</Text>
    {!!subtitle && <Text variant="caption" color="hint" style={styles.sectionSub}>{subtitle}</Text>}
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const Stat = ({ theme, label, value, accent }: any) => (
  <View style={styles.stat}>
    <Text variant="captionSmall" color="hint">{label}</Text>
    <Text variant="body" style={[styles.statValue, { color: accent ? colors.primary.main : theme.colors.text }]}>
      {value}
    </Text>
  </View>
);

const Label = ({ theme, children }: any) => (
  <Text variant="captionSmall" color="hint" style={styles.fieldLabel}>{children}</Text>
);

const KeyField = ({
  theme,
  label,
  status,
  value,
  onChange,
  secure,
}: {
  theme: any;
  label: string;
  status?: ProviderKeyStatus['google'];
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
}) => (
  <View style={styles.keyField}>
    <View style={styles.keyHeader}>
      <Text variant="captionSmall" color="hint">{label}</Text>
      {status && (
        <Text variant="captionSmall" style={{ color: status.configured ? colors.success.main : theme.colors.textHint }}>
          {status.source === 'app' ? 'Set in app' : status.source === 'env' ? 'From environment' : 'Not set'}
        </Text>
      )}
    </View>
    <TextInput
      style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.cardElevated }]}
      value={value}
      onChangeText={onChange}
      secureTextEntry={secure}
      autoCapitalize="none"
      autoCorrect={false}
      placeholder={status?.configured ? '•••••••• (leave blank to keep)' : 'Enter value'}
      placeholderTextColor={theme.colors.textHint}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: ms(4) },
  headerTitle: { flex: 1, marginLeft: spacing.sm },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(16),
    paddingHorizontal: spacing.md,
    paddingVertical: ms(6),
  },
  saveText: { marginLeft: spacing.xs, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  gap: { marginTop: spacing.sm },
  subtle: { marginTop: spacing.xs, paddingHorizontal: spacing.lg },
  retryBtn: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  content: { padding: spacing.md },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(14),
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionSub: { marginTop: spacing.xs },
  sectionBody: { marginTop: spacing.md },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(12),
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dot: { width: ms(10), height: ms(10), borderRadius: ms(5) },
  modelInfo: { flex: 1 },
  bold: { fontWeight: '600' },
  defaultBadge: { borderRadius: ms(10), paddingHorizontal: spacing.sm, paddingVertical: ms(3) },
  setDefaultBtn: { paddingHorizontal: spacing.sm, paddingVertical: ms(3) },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  stat: { flex: 1 },
  statValue: { fontWeight: '700', marginTop: ms(2) },
  barTrack: { height: ms(8), borderRadius: ms(4), overflow: 'hidden', marginTop: spacing.xs },
  barFill: { height: '100%', borderRadius: ms(4) },
  barLabel: { marginTop: spacing.xs },
  fieldLabel: { marginTop: spacing.md, marginBottom: spacing.xs, letterSpacing: 0.3 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(10),
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? ms(10) : ms(8),
    fontSize: fontSizes.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  topupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addBtn: {
    borderRadius: ms(10),
    paddingHorizontal: spacing.lg,
    paddingVertical: ms(10),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: ms(60),
  },
  keyField: { marginBottom: spacing.sm },
  keyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  usageRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: ms(4), gap: spacing.sm },
});

export default AISettingsScreen;
