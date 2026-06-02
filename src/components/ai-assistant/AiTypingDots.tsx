/** Animated three-dot "AI is thinking" indicator. */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms } from '../../utils/responsive';

const Dot: React.FC<{ delay: number; color: string }> = ({ delay, color }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, delay]);
  return <Animated.View style={[styles.dot, { opacity, backgroundColor: color }]} />;
};

export const AiTypingDots: React.FC = () => {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <Dot delay={0} color={theme.colors.textSecondary} />
      <Dot delay={150} color={theme.colors.textSecondary} />
      <Dot delay={300} color={theme.colors.textSecondary} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: ms(6) },
  dot: { width: ms(7), height: ms(7), borderRadius: ms(4), marginRight: ms(5) },
});

export default AiTypingDots;
