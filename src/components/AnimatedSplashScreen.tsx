import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onAnimationComplete: () => void;
}

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  onAnimationComplete,
}) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;

  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const loaderScale = useRef(new Animated.Value(0.5)).current;

  const footerOpacity = useRef(new Animated.Value(0)).current;

  // Pulse animation for loader dots
  const dot1Scale = useRef(new Animated.Value(1)).current;
  const dot2Scale = useRef(new Animated.Value(1)).current;
  const dot3Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start the intro animation sequence (without auto-fade)
    const introAnimation = Animated.sequence([
      // Phase 1: Logo appears with scale and rotation
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),

      // Phase 2: Title slides up and fades in
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),

      // Phase 3: Subtitle appears
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(subtitleTranslateY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),

      // Phase 4: Loader and footer appear
      Animated.parallel([
        Animated.timing(loaderOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(loaderScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // Phase 5: Minimum hold time to ensure smooth experience
      Animated.delay(500),
    ]);

    // Start pulsing dots animation (runs continuously)
    const createPulse = (dotScale: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotScale, {
            toValue: 1.4,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dotScale, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      createPulse(dot1Scale, 0),
      createPulse(dot2Scale, 150),
      createPulse(dot3Scale, 300),
    ]).start();

    // Run intro animation, then notify parent that animation is complete
    // Parent will hide splash when navigation is ready
    introAnimation.start(() => {
      onAnimationComplete();
    });
  }, []);

  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

  return (
    <Animated.View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary.dark} />
      <LinearGradient
        colors={[colors.primary.dark, colors.primary.main, colors.primary.light]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        {/* Decorative circles */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />

        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { rotate: logoRotateInterpolate },
              ],
            },
          ]}>
          <View style={styles.logoBackground}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* App Title */}
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}>
          Truckast
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}>
          Ready Mix Delivery
        </Animated.Text>

        {/* Animated Loader Dots */}
        <Animated.View
          style={[
            styles.loaderContainer,
            {
              opacity: loaderOpacity,
              transform: [{ scale: loaderScale }],
            },
          ]}>
          <Animated.View
            style={[styles.loaderDot, { transform: [{ scale: dot1Scale }] }]}
          />
          <Animated.View
            style={[styles.loaderDot, { transform: [{ scale: dot2Scale }] }]}
          />
          <Animated.View
            style={[styles.loaderDot, { transform: [{ scale: dot3Scale }] }]}
          />
        </Animated.View>

        {/* Footer */}
        <Animated.Text style={[styles.footer, { opacity: footerOpacity }]}>
          Powered by TruckApp
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -height * 0.15,
    right: -width * 0.2,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.3,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.common.white,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  loaderContainer: {
    flexDirection: 'row',
    marginTop: 48,
    gap: 12,
  },
  loaderDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
  },
});

export default AnimatedSplashScreen;
