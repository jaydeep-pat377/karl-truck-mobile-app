import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { colors } from '../../theme/colors';
import { fontFamily, fontSize } from '../../theme/typography';
import { FrameSvg } from '../../assets/svgs/FrameSvg';

interface SplashScreenProps {

  appName?: string;

  primaryColor?: string;

  secondaryColor?: string;

  svgWidth?: number;

  svgHeight?: number;

  fadeInDuration?: number;

  fadeInDelay?: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  appName = 'Truckast AI',
  primaryColor = colors.primary.main,
  secondaryColor = colors.primary.dark,
  svgWidth = 200,
  svgHeight = 110,
  fadeInDuration = 800,
  fadeInDelay = 200,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: fadeInDuration,
        delay: fadeInDelay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: fadeInDuration,
        delay: fadeInDelay,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: fadeInDuration,
        delay: fadeInDelay + 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(textSlideAnim, {
        toValue: 0,
        duration: fadeInDuration,
        delay: fadeInDelay + 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, textFadeAnim, textSlideAnim, fadeInDuration, fadeInDelay]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.common.white}
        translucent={Platform.OS === 'android'}
      />
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.svgContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          <FrameSvg
            width={svgWidth}
            height={svgHeight}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textFadeAnim,
              transform: [{ translateY: textSlideAnim }],
            },
          ]}>
          <Text style={[styles.appName, { color: primaryColor }]}>
            {appName}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.common.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  appName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    letterSpacing: 1,
  },
});

export default SplashScreen;
