import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ms } from '../../utils/responsive';
import { colors } from '../../theme/colors';

interface CircularProgressProps {
  size?: number;
  progress: number;
  progressColor?: string;
  backgroundColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 50,
  progress,
  progressColor = colors.secondary.main,
  backgroundColor = colors.primary.dark,
  strokeColor = colors.secondary.main,
  strokeWidth = 2,
}) => {
  const scaledSize = ms(size);
  const scaledStroke = ms(strokeWidth);
  const radius = (scaledSize - scaledStroke) / 2;
  const center = scaledSize / 2;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  const getArcPath = (percentage: number) => {
    if (percentage >= 100) {

      return `M ${center} ${scaledStroke / 2} A ${radius} ${radius} 0 1 1 ${center - 0.001} ${scaledStroke / 2} Z`;
    }
    if (percentage <= 0) {
      return '';
    }

    const angle = (percentage / 100) * 360;
    const radians = (angle - 90) * (Math.PI / 180);
    const x = center + radius * Math.cos(radians);
    const y = center + radius * Math.sin(radians);
    const largeArcFlag = angle > 180 ? 1 : 0;

    return `M ${center} ${center} L ${center} ${scaledStroke / 2} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x} ${y} Z`;
  };

  return (
    <View style={[styles.container, { width: scaledSize, height: scaledSize }]}>
      <Svg width={scaledSize} height={scaledSize}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill={backgroundColor}
          stroke={strokeColor}
          strokeWidth={scaledStroke}
        />
        {clampedProgress > 0 && (
          <Path
            d={getArcPath(clampedProgress)}
            fill={progressColor}
          />
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CircularProgress;
