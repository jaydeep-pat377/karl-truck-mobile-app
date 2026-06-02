/** "Try next" follow-up question chips. */
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon } from '../common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing } from '../../utils/responsive';

interface Props {
  followUps: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
}

export const AiFollowUpChips: React.FC<Props> = ({ followUps, onPick, disabled }) => {
  const theme = useAppTheme();
  if (!followUps.length) return null;
  return (
    <View style={styles.wrap}>
      <Text variant="captionSmall" color="hint" style={styles.label}>
        SUGGESTED FOLLOW-UPS
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {followUps.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.chip,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.primary.main + '55',
                opacity: disabled ? 0.5 : 1,
              },
            ]}
            activeOpacity={0.7}
            disabled={disabled}
            onPress={() => onPick(f)}
          >
            <Icon name="arrow-top-right" size={ms(13)} color={theme.colors.primary.main} />
            <Text variant="caption" color="primary" style={styles.chipText}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.xs },
  label: { marginBottom: spacing.xs, marginLeft: spacing.xs, letterSpacing: 0.5 },
  row: { paddingRight: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(16),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  chipText: { marginLeft: spacing.xs, maxWidth: ms(220) },
});

export default AiFollowUpChips;
