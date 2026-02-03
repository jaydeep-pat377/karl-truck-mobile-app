import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { fontFamily } from '../../theme/typography';
import YellowTruck from '../../assets/svgs/yellowTruck.svg';

interface TruckLoaderProps {
  size?: number;
  message?: string;
  color?: 'light' | 'dark';
}

const TruckLoader: React.FC<TruckLoaderProps> = ({
  size = 150,
  message = 'Loading...',
  color = 'light',
}) => {
  // Wheel rotation animation
  const wheelRotation = useRef(new Animated.Value(0)).current;
  // Truck bounce animation
  const truckBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Wheel spinning animation - continuous
    const wheelAnimation = Animated.loop(
      Animated.timing(wheelRotation, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    // Truck bounce animation - subtle up and down
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

  const textColor = color === 'light' ? '#FFFFFF' : '#333333';

  // Calculate truck dimensions maintaining aspect ratio (157:86)
  const truckWidth = size;
  const truckHeight = (size * 86) / 157;

  // Calculate wheel positions based on size
  // Front wheel center in SVG: approximately x=132, y=70
  // Rear wheel center in SVG: approximately x=47, y=70
  const scale = size / 157;

  // Wheel overlay sizes
  const frontWheelSize = 16 * scale;
  const middleWheelSize = 20 * scale;
  const rearWheelSize = 20 * scale;

  // Position calculations - subtract half the wheel size to center it
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

        {/* Animated Wheel Overlays - Front Wheel */}
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

        {/* Animated Wheel Overlays - Middle Wheel */}
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

        {/* Animated Wheel Overlays - Rear Wheel */}
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

      {/* Road line */}
      <View
        style={[
          styles.roadLine,
          {
            width: truckWidth + 20,
            borderColor:
              color === 'light' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
          },
        ]}
      />

      {message && (
        <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      )}

      {/* Animated dots */}
      <LoadingDots color={textColor} />
    </View>
  );
};

// Animated loading dots component
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
    padding: 20,
  },
  truckContainer: {
    marginBottom: 8,
    position: 'relative',
  },
  roadLine: {
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
    marginTop: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  wheelOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelSpoke: {
    position: 'absolute',
    backgroundColor: '#3A3B4A',
    borderRadius: 1,
  },
  spokeRotated: {
    transform: [{ rotate: '90deg' }],
  },
});

export default TruckLoader;
