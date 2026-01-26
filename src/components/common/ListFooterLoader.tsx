import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from './Text';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';

interface ListFooterLoaderProps {
  isLoading?: boolean;
  hasMore?: boolean;
  totalItems?: number;
  showEndMessage?: boolean;
  loadingText?: string;
  endMessageText?: string;
  noMoreText?: string;
}

export const ListFooterLoader: React.FC<ListFooterLoaderProps> = ({
  isLoading = false,
  hasMore = false,
  totalItems,
  showEndMessage = true,
  loadingText = 'Loading more...',
  endMessageText,
  noMoreText = 'No more items',
}) => {
  const { isDark } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="small"
          color={colors.primary.main}
        />
        <Text
          variant="caption"
          color="secondary"
          style={styles.text}
        >
          {loadingText}
        </Text>
      </View>
    );
  }

  if (hasMore) {
    return (
      <View style={styles.container}>
        <Text variant="caption" color="hint">
          Scroll for more
        </Text>
      </View>
    );
  }

  if (showEndMessage && totalItems && totalItems > 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.divider, { backgroundColor: isDark ? colors.grey[60] : colors.grey[15] }]} />
        <Text variant="caption" color="secondary" style={styles.endText}>
          {endMessageText || `Showing all ${totalItems} items`}
        </Text>
      </View>
    );
  }

  if (showEndMessage && !hasMore && totalItems === 0) {
    return null;
  }

  if (showEndMessage && !hasMore) {
    return (
      <View style={styles.container}>
        <Text variant="caption" color="hint">
          {noMoreText}
        </Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: spacing.sm,
  },
  divider: {
    width: ms(40),
    height: 2,
    borderRadius: 1,
    marginBottom: spacing.sm,
  },
  endText: {
    textAlign: 'center',
  },
});

export default ListFooterLoader;
