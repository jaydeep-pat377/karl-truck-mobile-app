import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { TypingUser } from '../../types/chat';

interface TypingIndicatorProps {
  users: TypingUser[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDots = () => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dot1, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(dot1, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot2, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(dot2, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot3, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(dot3, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDots();
  }, [dot1, dot2, dot3]);

  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].user_name} is typing`;
    } else if (users.length === 2) {
      return `${users[0].user_name} and ${users[1].user_name} are typing`;
    } else {
      return `${users.length} people are typing`;
    }
  };

  const dotStyle = (animValue: Animated.Value) => ({
    opacity: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.bubble, { backgroundColor: themeColors.card }]}>
        <Text variant="caption" color="secondary" style={styles.text}>
          {getTypingText()}
        </Text>
        <View style={styles.dots}>
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: colors.primary.main },
              dotStyle(dot1),
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: colors.primary.main },
              dotStyle(dot2),
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: colors.primary.main },
              dotStyle(dot3),
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: ms(16),
  },
  text: {
    marginRight: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    marginHorizontal: ms(2),
  },
});

export default TypingIndicator;
