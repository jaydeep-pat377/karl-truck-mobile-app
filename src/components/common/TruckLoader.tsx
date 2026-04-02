import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { fontFamily } from '../../theme/typography';
import { colors } from '../../theme/colors';
import { ms } from '../../utils/responsive';
import YellowTruck from '../../assets/svgs/yellowTruck.svg';

interface TruckLoaderProps {
  size?: number;
  message?: string;
  color?: 'light' | 'dark';
  fontSize?: number;
}

const TruckLoader: React.FC<TruckLoaderProps> = ({
  size = 150,
  message = 'Loading...',
  color = 'light',
  fontSize,
}) => {

  const wheelRotation = useRef(new Animated.Value(0)).current;

  const truckBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {

    const wheelAnimation = Animated.loop(
      Animated.timing(wheelRotation, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(truckBounce, {
          toValue: -3,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(truckBounce, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    wheelAnimation.start();
    bounceAnimation.start();

    return () => {
      wheelAnimation.stop();
      bounceAnimation.stop();
    };
  }, [wheelRotation, truckBounce]);

  const wheelSpin = wheelRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const textColor = color === 'light' ? colors.common.white : colors.text.dark;

  const truckWidth = size;
  const truckHeight = (size * 86) / 157;

  const scale = size / 157;

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
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.truckContainer,
          {
            width: truckWidth,
            height: truckHeight,
            transform: [{ translateY: truckBounce }],
          },
        ]}>
        <YellowTruck width={truckWidth} height={truckHeight} />
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
      </Animated.View>
      <View
        style={[
          styles.roadLine,
          {
            width: truckWidth + 20,
            borderColor:
              color === 'light' ? colors.semiTransparent.white30 : colors.semiTransparent.black20,
          },
        ]}
      />

      {message && (
        <Text style={[styles.message, { color: textColor }, fontSize != null && { fontSize }]}>{message}</Text>
      )}
      <LoadingDots color={textColor} />
    </View>
  );
};

const LoadingDots: React.FC<{ color: string }> = ({ color }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDots = () => {
      Animated.loop(
        Animated.stagger(150, [
          Animated.sequence([
            Animated.timing(dot1, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot1, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot2, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot2, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot3, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot3, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ).start();
    };

    animateDots();
  }, [dot1, dot2, dot3]);

  const dotStyle = (animValue: Animated.Value) => ({
    opacity: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.3],
        }),
      },
    ],
  });

  return (
    <View style={styles.dotsContainer}>
      <Animated.View
        style={[styles.dot, { backgroundColor: color }, dotStyle(dot1)]}
      />
      <Animated.View
        style={[styles.dot, { backgroundColor: color }, dotStyle(dot2)]}
      />
      <Animated.View
        style={[styles.dot, { backgroundColor: color }, dotStyle(dot3)]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: ms(20),
  },
  truckContainer: {
    marginBottom: ms(8),
    position: 'relative',
  },
  roadLine: {
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    marginBottom: ms(16),
  },
  message: {
    fontSize: ms(16),
    fontFamily: fontFamily.medium,
    marginTop: ms(8),
    textAlign: 'center',
    ...Platform.select({
      ios: { lineHeight: ms(22) },
      android: {},
    }),
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: ms(8),
    ...Platform.select({
      ios: {},
      android: { gap: 6 },
    }),
  },
  dot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    marginHorizontal: Platform.OS === 'ios' ? ms(3) : 0,
  },
  wheelOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelSpoke: {
    position: 'absolute',
    backgroundColor: colors.loader.wheelSpoke,
    borderRadius: 1,
  },
  spokeRotated: {
    transform: [{ rotate: '90deg' }],
  },
});

export default TruckLoader;
