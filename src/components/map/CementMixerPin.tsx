import React from 'react';
import Svg, { Path, Circle, Rect, Line, Ellipse } from 'react-native-svg';

interface CementMixerPinProps {
  color: string;
  size?: number;
}

export const CementMixerPin: React.FC<CementMixerPinProps> = React.memo(({ color, size = 48 }) => {
  const height = size * 1.15;

  return (
    <Svg width={size} height={height} viewBox="0 0 400 460">
      {/* Map pin shape */}
      <Path
        fill={color}
        d="M200 20 C130 20 75 75 75 145 C75 215 145 290 200 380 C255 290 325 215 325 145 C325 75 270 20 200 20Z"
      />

      {/* White circle cutout inside pin */}
      <Circle cx={200} cy={145} r={110} fill="white" />

      {/* Cab body */}
      <Rect fill={color} x={118} y={148} width={52} height={32} rx={3} />
      {/* Cab roof / windshield area */}
      <Path fill={color} d="M120 148 L130 128 L164 128 L170 148Z" />
      {/* Windshield window */}
      <Path fill="white" d="M132 147 L140 131 L162 131 L168 147Z" />
      {/* Cab side window */}
      <Rect fill="white" x={122} y={150} width={16} height={14} rx={2} />

      {/* Truck chassis / frame */}
      <Rect fill={color} x={116} y={178} width={170} height={10} rx={2} />

      {/* Drum support frame */}
      <Rect fill={color} x={166} y={140} width={8} height={38} rx={2} />
      <Rect fill={color} x={270} y={140} width={8} height={38} rx={2} />

      {/* Cement mixer drum */}
      <Ellipse fill={color} cx={222} cy={148} rx={62} ry={28} />
      {/* Drum highlight */}
      <Ellipse fill="white" cx={222} cy={148} rx={50} ry={20} opacity={0.12} />
      {/* Drum ribs */}
      <Line stroke="white" strokeWidth={1.5} strokeOpacity={0.2} x1={195} y1={121} x2={187} y2={175} />
      <Line stroke="white" strokeWidth={1.5} strokeOpacity={0.2} x1={222} y1={120} x2={222} y2={176} />
      <Line stroke="white" strokeWidth={1.5} strokeOpacity={0.2} x1={249} y1={121} x2={257} y2={175} />

      {/* Drum chute */}
      <Path fill={color} d="M276 158 L295 170 L293 176 L273 166Z" />

      {/* Front bumper */}
      <Rect fill={color} x={114} y={174} width={10} height={6} rx={1} />

      {/* Wheels */}
      <Circle fill={color} cx={143} cy={192} r={13} />
      <Circle fill="white" cx={143} cy={192} r={6} />
      <Circle fill={color} cx={143} cy={192} r={2.5} />

      <Circle fill={color} cx={235} cy={192} r={13} />
      <Circle fill="white" cx={235} cy={192} r={6} />
      <Circle fill={color} cx={235} cy={192} r={2.5} />

      <Circle fill={color} cx={263} cy={192} r={13} />
      <Circle fill="white" cx={263} cy={192} r={6} />
      <Circle fill={color} cx={263} cy={192} r={2.5} />

      {/* Headlight */}
      <Rect fill="white" x={115} y={156} width={6} height={5} rx={1} opacity={0.85} />
    </Svg>
  );
});

export default CementMixerPin;
