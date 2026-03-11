import React, { memo, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ViewStyle,
  StyleProp,
  Animated,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface TopGradientBackgroundProps {

  height?: number | string;

  showWaves?: boolean;

  animated?: boolean;

  customColors?: string[];

  style?: StyleProp<ViewStyle>;

  children?: React.ReactNode;

  absolute?: boolean;

  waveOpacity?: number;
}

const generateWavePath = (
  width: number,
  height: number,
  amplitude: number,
  frequency: number,
  yOffset: number,
  phase: number = 0
): string => {
  const points: string[] = [];
  const steps = 50;

  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const y = yOffset + Math.sin((i / steps) * Math.PI * frequency + phase) * amplitude;
    points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }

  points.push(`L ${width} ${height}`);
  points.push(`L 0 ${height}`);
  points.push('Z');

  return points.join(' ');
};

const generateSmoothWavePath = (
  width: number,
  height: number,
  startY: number,
  midY: number,
  endY: number
): string => {
  const cp1x = width * 0.25;
  const cp1y = startY + (midY - startY) * 0.5;
  const cp2x = width * 0.75;
  const cp2y = midY + (endY - midY) * 0.5;

  return `
    M 0 ${startY}
    C ${cp1x} ${cp1y - 20}, ${width * 0.4} ${midY + 30}, ${width * 0.5} ${midY}
    C ${width * 0.6} ${midY - 30}, ${cp2x} ${cp2y + 20}, ${width} ${endY}
    L ${width} ${height}
    L 0 ${height}
    Z
  `;
};

interface WaveOverlayProps {
  width: number;
  height: number;
  opacity: number;
  isDark: boolean;
  animated?: boolean;
}

const WaveOverlay: React.FC<WaveOverlayProps> = memo(({
  width,
  height,
  opacity,
  isDark,
  animated = false,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        })
      ).start();
    }
  }, [animated, animatedValue]);

  const wave1StartY = height * 0.3;
  const wave1MidY = height * 0.45;
  const wave1EndY = height * 0.35;

  const wave2StartY = height * 0.5;
  const wave2MidY = height * 0.65;
  const wave2EndY = height * 0.55;

  const wave3StartY = height * 0.7;
  const wave3MidY = height * 0.82;
  const wave3EndY = height * 0.75;

  const waveColor = isDark ? colors.common.white : colors.common.white;

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>

        <SvgGradient id="waveGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={waveColor} stopOpacity={0} />
          <Stop offset="50%" stopColor={waveColor} stopOpacity={opacity * 0.3} />
          <Stop offset="100%" stopColor={waveColor} stopOpacity={opacity * 0.5} />
        </SvgGradient>

        <SvgGradient id="waveGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={waveColor} stopOpacity={0} />
          <Stop offset="40%" stopColor={waveColor} stopOpacity={opacity * 0.4} />
          <Stop offset="100%" stopColor={waveColor} stopOpacity={opacity * 0.7} />
        </SvgGradient>

        <SvgGradient id="waveGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={waveColor} stopOpacity={0} />
          <Stop offset="30%" stopColor={waveColor} stopOpacity={opacity * 0.5} />
          <Stop offset="100%" stopColor={waveColor} stopOpacity={1} />
        </SvgGradient>
      </Defs>

      <Path
        d={generateSmoothWavePath(width, height, wave1StartY, wave1MidY, wave1EndY)}
        fill="url(#waveGrad1)"
      />

      <Path
        d={generateSmoothWavePath(width, height, wave2StartY, wave2MidY, wave2EndY)}
        fill="url(#waveGrad2)"
      />

      <Path
        d={generateSmoothWavePath(width, height, wave3StartY, wave3MidY, wave3EndY)}
        fill="url(#waveGrad3)"
      />
    </Svg>
  );
});

WaveOverlay.displayName = 'WaveOverlay';

export const TopGradientBackground: React.FC<TopGradientBackgroundProps> = memo(({
  height = '45%',
  showWaves = true,
  animated = false,
  customColors,
  style,
  children,
  absolute = true,
  waveOpacity = 0.15,
}) => {
  const { isDark } = useTheme();

  const actualHeight = useMemo(() => {
    if (typeof height === 'number') {
      return height;
    }
    if (typeof height === 'string' && height.endsWith('%')) {
      const percentage = parseFloat(height) / 100;
      return SCREEN_HEIGHT * percentage;
    }
    return SCREEN_HEIGHT * 0.45;
  }, [height]);

  const gradientColors = useMemo(() => {
    if (customColors && customColors.length >= 3) {
      return customColors;
    }

    if (isDark) {
      return [
        colors.primary.dark,
        colors.primary.main,
        colors.grey[80],
        colors.dark.background,
      ];
    }

    return [
      colors.primary.dark,
      colors.primary.main,
      colors.primary.light,
      colors.success.background,
      colors.light.background,
    ];
  }, [isDark, customColors]);

  const gradientLocations = useMemo(() => {

    const colorCount = gradientColors.length;
    if (colorCount === 5) {
      return [0, 0.2, 0.4, 0.7, 1];
    } else if (colorCount === 4) {
      return [0, 0.3, 0.7, 1];
    } else if (colorCount === 3) {
      return [0, 0.5, 1];
    }
    return [0, 0.2, 0.4, 0.7, 1];
  }, [gradientColors.length]);

  const containerStyle = useMemo((): ViewStyle => ({
    width: SCREEN_WIDTH,
    height: actualHeight,
    ...(absolute ? {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 0,
    } : {}),
  }), [actualHeight, absolute]);

  return (
    <View style={[containerStyle, style]} pointerEvents="box-none">
      <LinearGradient
        colors={gradientColors}
        locations={gradientLocations}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {showWaves && (
        <WaveOverlay
          width={SCREEN_WIDTH}
          height={actualHeight}
          opacity={waveOpacity}
          isDark={isDark}
          animated={animated}
        />
      )}

      {children}
    </View>
  );
});

TopGradientBackground.displayName = 'TopGradientBackground';

export interface SimpleTopGradientProps {
  height?: number | string;
  customColors?: string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  absolute?: boolean;
}

export const SimpleTopGradient: React.FC<SimpleTopGradientProps> = memo(({
  height = '40%',
  customColors,
  style,
  children,
  absolute = true,
}) => {
  const { isDark } = useTheme();

  const actualHeight = useMemo(() => {
    if (typeof height === 'number') return height;
    if (typeof height === 'string' && height.endsWith('%')) {
      return SCREEN_HEIGHT * (parseFloat(height) / 100);
    }
    return SCREEN_HEIGHT * 0.4;
  }, [height]);

  const gradientColors = useMemo(() => {
    if (customColors && customColors.length >= 2) {
      return customColors;
    }

    if (isDark) {
      return [
        colors.primary.dark,
        colors.grey[80],
        colors.dark.background,
      ];
    }

    return [
      colors.primary.main,
      colors.primary.light + '80',
      colors.light.background,
    ];
  }, [isDark, customColors]);

  const containerStyle = useMemo((): ViewStyle => ({
    width: SCREEN_WIDTH,
    height: actualHeight,
    ...(absolute ? {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 0,
    } : {}),
  }), [actualHeight, absolute]);

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[containerStyle, style]}
    >
      {children}
    </LinearGradient>
  );
});

SimpleTopGradient.displayName = 'SimpleTopGradient';

export default TopGradientBackground;
