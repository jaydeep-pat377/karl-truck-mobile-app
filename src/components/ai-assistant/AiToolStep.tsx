/** Renders a single tool-execution step in the assistant message timeline. */
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Icon } from '../common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing } from '../../utils/responsive';
import type { AiToolPart } from '../../types/ai-assistant';

const TOOL_META: Record<
  string,
  { icon: string; label: string; activeLabel: string }
> = {
  resolveDateRange: { icon: 'calendar-outline', label: 'Resolved date range', activeLabel: 'Resolving date range…' },
  resolveKpi: { icon: 'bullseye-arrow', label: 'Matched KPI', activeLabel: 'Matching KPI…' },
  suggestTemplate: { icon: 'view-dashboard-outline', label: 'Selected template', activeLabel: 'Choosing template…' },
  aggregateData: { icon: 'sigma', label: 'Aggregated data', activeLabel: 'Aggregating in Postgres…' },
  planDashboard: { icon: 'view-grid-outline', label: 'Planned layout', activeLabel: 'Planning layout…' },
  queryDatabase: { icon: 'database-search-outline', label: 'Queried database', activeLabel: 'Querying database…' },
  generateDashboard: { icon: 'chart-box-outline', label: 'Generated dashboard', activeLabel: 'Generating dashboard…' },
  generateInsights: { icon: 'lightbulb-on-outline', label: 'Surfaced insights', activeLabel: 'Surfacing insights…' },
  suggestFollowUps: { icon: 'message-text-outline', label: 'Suggested follow-ups', activeLabel: 'Drafting follow-ups…' },
  analyzeData: { icon: 'brain', label: 'Analyzed data', activeLabel: 'Analyzing data…' },
  getSchemaInfo: { icon: 'table-search', label: 'Read schema', activeLabel: 'Reading schema…' },
};

export const AiToolStep: React.FC<{ part: AiToolPart }> = ({ part }) => {
  const theme = useAppTheme();
  const meta =
    TOOL_META[part.toolName] || {
      icon: 'cog-outline',
      label: part.toolName,
      activeLabel: `${part.toolName}…`,
    };

  const isActive = part.state === 'input-streaming' || part.state === 'input-available';
  const isError = part.state === 'output-error';
  const rows =
    part.toolName === 'queryDatabase' && (part.output as any)?.totalRows;

  return (
    <View style={styles.row}>
      {isActive ? (
        <ActivityIndicator size="small" color={theme.colors.textSecondary} style={styles.icon} />
      ) : isError ? (
        <Icon name="close-circle-outline" size={ms(15)} color={theme.colors.textSecondary} style={styles.icon} />
      ) : (
        <Icon name="check-circle" size={ms(15)} color={theme.colors.success.main} style={styles.icon} />
      )}
      <Icon name={meta.icon} size={ms(14)} color={theme.colors.textSecondary} style={styles.toolIcon} />
      <Text variant="caption" color="secondary" style={styles.label} numberOfLines={1}>
        {isActive ? meta.activeLabel : isError ? `${meta.label} — retrying` : meta.label}
      </Text>
      {typeof rows === 'number' && (
        <Text variant="captionSmall" color="hint" style={styles.rows}>
          {rows} rows
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: ms(3) },
  icon: { marginRight: spacing.xs, width: ms(16) },
  toolIcon: { marginRight: spacing.xs },
  label: { flexShrink: 1 },
  rows: { marginLeft: 'auto', paddingLeft: spacing.xs },
});

export default AiToolStep;
