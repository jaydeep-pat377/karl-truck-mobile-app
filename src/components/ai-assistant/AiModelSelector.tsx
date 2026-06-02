/** Bottom-sheet model picker. */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, BottomSheet } from '../common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing } from '../../utils/responsive';
import { MODELS, TIER_COLOR } from '../../lib/ai/models';

interface Props {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (id: string) => void;
}

export const AiModelSelector: React.FC<Props> = ({ visible, onClose, value, onChange }) => {
  const theme = useAppTheme();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Choose model"
      headerIcon="robot-outline"
      height="content"
    >
      {MODELS.map((m) => {
        const selected = m.id === value;
        const tint = m.color ?? TIER_COLOR[m.tier];
        return (
          <TouchableOpacity
            key={m.id}
            activeOpacity={0.7}
            onPress={() => {
              onChange(m.id);
              onClose();
            }}
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.cardElevated,
                borderColor: selected ? theme.colors.primary.main : theme.colors.border,
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: tint }]} />
            <View style={styles.info}>
              <Text variant="body" color="primary" style={styles.name}>
                {m.label}
              </Text>
              <Text variant="caption" color="secondary">
                {m.tagline}
              </Text>
            </View>
            {selected && <Icon name="check-circle" size={ms(20)} color={theme.colors.primary.main} />}
          </TouchableOpacity>
        );
      })}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: ms(12),
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dot: { width: ms(10), height: ms(10), borderRadius: ms(5), marginRight: spacing.md },
  info: { flex: 1 },
  name: { fontWeight: '600' },
});

export default AiModelSelector;
