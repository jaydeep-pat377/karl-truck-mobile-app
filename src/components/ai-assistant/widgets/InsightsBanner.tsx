import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import type { DashboardInsight, InsightSeverity } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { colors } from '../../../theme/colors';
import { ms, spacing, iconSizes } from '../../../utils/responsive';
import { Text, Icon } from '../../../components/common';

interface SeverityStyle {
  color: string;
  icon: string;
  tint: string;
}

function severityStyle(severity: InsightSeverity): SeverityStyle {
  switch (severity) {
    case 'alert':
      return { color: colors.error.main, icon: 'alert-octagon', tint: 'rgba(196,57,38,0.12)' };
    case 'warning':
      return { color: colors.warning.main, icon: 'alert', tint: 'rgba(247,187,0,0.12)' };
    case 'info':
    default:
      return { color: colors.secondary.main, icon: 'information', tint: 'rgba(47,126,216,0.12)' };
  }
}

export function InsightsBanner({
  insights,
  onDismiss,
}: {
  insights: DashboardInsight[];
  onDismiss?: () => void;
}) {
  const theme = useAppTheme();

  if (!Array.isArray(insights) || insights.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss insights"
        >
          <Icon name="close" size={iconSizes.sm} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
      {insights.map((insight, i) => {
        const sev = severityStyle(insight.severity);
        return (
          <View key={i} style={[styles.row, { backgroundColor: sev.tint }]}>
            <Icon name={sev.icon} size={iconSizes.sm} color={sev.color} style={styles.icon} />
            <Text variant="bodySmall" color="primary" style={styles.title} numberOfLines={3}>
              {insight.title}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  dismiss: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    padding: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: ms(10),
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  icon: {
    marginTop: ms(1),
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
  },
});

export default InsightsBanner;
