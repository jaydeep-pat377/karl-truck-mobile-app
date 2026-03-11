import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme/colors';
import GreenTruck from '../assets/svgs/greenTruck.svg';

const { width, height } = Dimensions.get('window');

const TRUCK_WIDTH = 200;
const TRUCK_HEIGHT = (TRUCK_WIDTH * 86) / 157;

interface AnimatedSplashScreenProps {
  onAnimationComplete: () => void;
}

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  onAnimationComplete,
}) => {

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;

  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const loaderScale = useRef(new Animated.Value(0.5)).current;

  const footerOpacity = useRef(new Animated.Value(0)).current;

  const dot1Scale = useRef(new Animated.Value(1)).current;
  const dot2Scale = useRef(new Animated.Value(1)).current;
  const dot3Scale = useRef(new Animated.Value(1)).current;

  const wheelRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {

    const introAnimation = Animated.sequence([

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
      ]),

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

      Animated.delay(500),
    ]);

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

    const wheelAnimation = Animated.loop(
      Animated.timing(wheelRotation, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    wheelAnimation.start();

    introAnimation.start(() => {
      onAnimationComplete();
    });

    return () => {
      wheelAnimation.stop();
    };
  }, []);

  const wheelSpin = wheelRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale = TRUCK_WIDTH / 157;
  const frontWheelSize = 16 * scale;
  const middleWheelSize = 20 * scale;
  const rearWheelSize = 20 * scale;
  const frontWheelRight = (157 - 127) * scale - frontWheelSize / 2;
  const frontWheelBottom = (86 - 75) * scale - frontWheelSize / 2;
  const middleWheelLeft = 63 * scale - middleWheelSize / 2;
  const middleWheelBottom = (86 - 75) * scale - middleWheelSize / 2;
  const rearWheelLeft = 43 * scale - rearWheelSize / 2;
  const rearWheelBottom = (86 - 75) * scale - rearWheelSize / 2;

  return (
    <Animated.View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary.dark} />
      <LinearGradient
        colors={[colors.primary.dark, colors.primary.main, colors.primary.light]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />

        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}>
          <View style={styles.truckShadow}>
            <View style={styles.truckWrapper}>
              <GreenTruck width={TRUCK_WIDTH} height={TRUCK_HEIGHT} />

            <Animated.View
              style={[
                styles.wheelOverlay,
                {
                  width: frontWheelSize,
                  height: frontWheelSize,
                  right: frontWheelRight,
                  bottom: frontWheelBottom,
                  transform: [{ rotate: wheelSpin }],
                },
              ]}>
              <View
                style={[
                  styles.wheelSpoke,
                  { height: frontWheelSize * 0.75, width: 2 * scale },
                ]}
              />
              <View
                style={[
                  styles.wheelSpoke,
                  styles.spokeRotated,
                  { height: frontWheelSize * 0.75, width: 2 * scale },
                ]}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.wheelOverlay,
                {
                  width: middleWheelSize,
                  height: middleWheelSize,
                  left: middleWheelLeft,
                  bottom: middleWheelBottom,
                  transform: [{ rotate: wheelSpin }],
                },
              ]}>
              <View
                style={[
                  styles.wheelSpoke,
                  { height: middleWheelSize * 0.8, width: 2 * scale },
                ]}
              />
              <View
                style={[
                  styles.wheelSpoke,
                  styles.spokeRotated,
                  { height: middleWheelSize * 0.8, width: 2 * scale },
                ]}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.wheelOverlay,
                {
                  width: rearWheelSize,
                  height: rearWheelSize,
                  left: rearWheelLeft,
                  bottom: rearWheelBottom,
                  transform: [{ rotate: wheelSpin }],
                },
              ]}>
              <View
                style={[
                  styles.wheelSpoke,
                  { height: rearWheelSize * 0.8, width: 2 * scale },
                ]}
              />
              <View
                style={[
                  styles.wheelSpoke,
                  styles.spokeRotated,
                  { height: rearWheelSize * 0.8, width: 2 * scale },
                ]}
              />
            </Animated.View>
            </View>
          </View>
        </Animated.View>

        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}>
          Truckast AI
        </Animated.Text>

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

        <Animated.Text style={[styles.footer, { opacity: footerOpacity }]}>
          Powered by Truckast AI
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
    backgroundColor: colors.splash.decorativeCircle1,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.3,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: colors.splash.decorativeCircle2,
  },
  logoContainer: {
    marginBottom: 24,
  },
  truckShadow: {
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  truckWrapper: {
    width: TRUCK_WIDTH,
    height: TRUCK_HEIGHT,
    position: 'relative',
  },
  wheelOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelSpoke: {
    position: 'absolute',
    backgroundColor: colors.splash.wheelSpokes,
    borderRadius: 1,
  },
  spokeRotated: {
    transform: [{ rotate: '90deg' }],
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.common.white,
    letterSpacing: 1,
    textShadowColor: colors.semiTransparent.black20,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.splash.subtitle,
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
    backgroundColor: colors.splash.loaderDots,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    fontSize: 12,
    color: colors.splash.footer,
    letterSpacing: 0.5,
  },
});

export default AnimatedSplashScreen;
