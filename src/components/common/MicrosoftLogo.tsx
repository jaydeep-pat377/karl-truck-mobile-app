import React from 'react';
import Svg, { Rect } from 'react-native-svg';

interface MicrosoftLogoProps {
  size?: number;
}

export const MicrosoftLogo: React.FC<MicrosoftLogoProps> = ({ size = 20 }) => {
  const half = size / 2;
  const gap = size * 0.05;

  return (
    <Svg width={size} height={size} viewBox="0 0 21 21">
      <Rect x="0" y="0" width="10" height="10" fill="#F25022" />
      <Rect x="11" y="0" width="10" height="10" fill="#7FBA00" />
      <Rect x="0" y="11" width="10" height="10" fill="#00A4EF" />
      <Rect x="11" y="11" width="10" height="10" fill="#FFB900" />
    </Svg>
  );
};

export default MicrosoftLogo;
