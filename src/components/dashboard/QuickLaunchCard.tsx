import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';

export interface QuickLaunchAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  screen?: string;
  permission?: string;
  onPress?: () => void;
}

interface QuickLaunchCardProps {
  action: QuickLaunchAction;
  onPress?: () => void;
}

export const QuickLaunchCard: React.FC<QuickLaunchCardProps> = ({
  action,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress || action.onPress}
      activeOpacity={0.8}
      disabled={!onPress && !action.onPress}
    >
      <View style={styles.iconContainer}>
        <Icon name={action.icon} size={ms(24)} color={colors.common.white} />
      </View>
      <View style={styles.textContainer}>
        {action.subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {action.subtitle}
          </Text>
        )}
        <Text style={styles.title} numberOfLines={2}>
          {action.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.secondary.main,
    borderRadius: ms(8),
    paddingHorizontal: ms(10),
    paddingTop: ms(12),
    paddingBottom: ms(10),
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    minHeight: ms(85),
  },
  iconContainer: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ms(8),
  },
  textContainer: {
    alignItems: 'center',
    flex: 1,
  },
  subtitle: {
    fontSize: ms(9),
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: ms(1),
    textAlign: 'center',
  },
  title: {
    fontSize: ms(10),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

export default QuickLaunchCard;
