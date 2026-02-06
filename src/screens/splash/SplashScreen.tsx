
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../../components/common/Text';
import { ms, vs } from '../../utils/responsive';

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  duration = 2500,
}) => {
  const { theme, isDark } = useTheme();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {

    Animated.sequence([

      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),

      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    const timer = setTimeout(() => {
      onFinish?.();
    }, duration);

    return () => {
      clearTimeout(timer);
      pulseAnimation.stop();
    };
  }, [duration, onFinish, logoOpacity, logoScale, textOpacity, loadingOpacity, pulseAnim]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View
          style={[
            styles.logoCircle,
            {
              backgroundColor: theme.colors.primary.main,
              shadowColor: theme.colors.primary.main,
            },
          ]}
        >
          <Text
            variant="h1"
            style={[styles.logoText, { color: theme.colors.primary.contrast }]}
          >
            KT
          </Text>
        </View>
      </Animated.View>
      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Text
          variant="h2"
          color="primary"
          style={styles.appName}
        >
          Karl Track
        </Text>
        <Text
          variant="bodySmall"
          color="secondary"
          style={styles.tagline}
        >
          Dolese ReadyMix
        </Text>
      </Animated.View>
      <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: theme.colors.primary.main,
                  opacity: pulseAnim,
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0.4, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
                index === 1 && { marginHorizontal: ms(8) },
              ]}
            />
          ))}
        </View>
        <Text
          variant="caption"
          color="hint"
          style={styles.loadingText}
        >
          Loading...
        </Text>
      </Animated.View>
      <View style={styles.versionContainer}>
        <Text variant="captionSmall" color="hint">
          Version 1.0.0
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: vs(24),
  },
  logoCircle: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoText: {
    fontSize: ms(36),
    fontWeight: '700',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: vs(48),
  },
  appName: {
    marginBottom: vs(4),
  },
  tagline: {
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(12),
  },
  dot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  loadingText: {
    letterSpacing: 0.5,
  },
  versionContainer: {
    position: 'absolute',
    bottom: vs(32),
  },
});

export default SplashScreen;
