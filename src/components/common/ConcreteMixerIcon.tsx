import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

export interface ConcreteMixerIconProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const ConcreteMixerIcon: React.FC<ConcreteMixerIconProps> = ({
  size = 24,
  color = colors.common.black,
  style,
}) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
    >
      <G>

        <Path
          d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <Path
          d="M5 6.5h7c1.1 0 2 .9 2 2v3c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-3c0-1.1.9-2 2-2z"
          fill={color}
          opacity={0.3}
        />
        <Path
          d="M4 7l4 2.5L4 12"
          stroke={color}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M13 7l-4 2.5 4 2.5"
          stroke={color}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        <Circle cx="6" cy="17" r="2" fill={color} />

        <Circle cx="18" cy="17" r="2" fill={color} />

        <Rect x="17" y="9" width="3" height="3" rx={0.5} fill={color} opacity={0.5} />
      </G>
    </Svg>
  );
};

export default ConcreteMixerIcon;
