import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';

interface ChatHeaderProps {
  title: string;
  onBack: () => void;
  onInfo?: () => void;
  orderCode?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  onBack,
  onInfo,
  orderCode,
}) => {
  // Remove "Order #" prefix from title if present
  const displayTitle = title.replace(/^Order\s*#/i, '').trim();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        activeOpacity={0.7}>
        <Icon name="arrow-left" size={ms(20)} color={colors.common.white} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.titleContainer}
        onPress={onInfo}
        activeOpacity={onInfo ? 0.7 : 1}
        disabled={!onInfo}>
        <Text style={styles.title} numberOfLines={1}>
          #{displayTitle}
        </Text>
        {orderCode && (
          <View style={styles.orderBadge}>
            <Icon name="clipboard-text-outline" size={ms(10)} color="rgba(255,255,255,0.8)" />
            <Text style={styles.orderText}>
              {orderCode}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: Platform.OS === 'ios' ? spacing.md : spacing.md,
    backgroundColor: colors.primary.main,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  titleContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: ms(18),
    fontWeight: '600',
    letterSpacing: -0.3,
    color: colors.common.white,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    marginTop: ms(2),
  },
  orderText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: ms(12),
    fontWeight: '500',
  },
});

export default ChatHeader;
