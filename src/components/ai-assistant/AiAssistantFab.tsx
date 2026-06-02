/**
 * Floating action button that opens the AI Assistant. It is DRAGGABLE — the
 * user can reposition it anywhere so it never permanently hides screen data.
 * A quick tap (no drag) opens the assistant; a drag relocates it.
 */
import React, { useRef } from 'react';
import { StyleSheet, Animated, PanResponder, Dimensions, ViewStyle } from 'react-native';

type Gesture = { dx: number; dy: number };
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms } from '../../utils/responsive';
import type { RootStackParamList } from '../../navigation/types';

interface Props {
  /** distance from the bottom edge (defaults clear of the tab bar) */
  bottom?: number;
  style?: ViewStyle;
}

const FAB_SIZE = ms(58);
const TAP_SLOP = 6;

export const AiAssistantFab: React.FC<Props> = ({ bottom = ms(96), style }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offset = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const { width: screenW, height: screenH } = Dimensions.get('window');
  // Drag bounds relative to the bottom-right anchor (offsets are <= 0).
  const minX = -(screenW - FAB_SIZE - ms(24));
  const maxX = 0;
  const minY = -(screenH - FAB_SIZE - ms(160));
  const maxY = ms(20);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e: any, g: Gesture) =>
        Math.abs(g.dx) > TAP_SLOP || Math.abs(g.dy) > TAP_SLOP,
      onPanResponderGrant: () => {
        moved.current = false;
        pan.setOffset({ x: offset.current.x, y: offset.current.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_e: any, g: Gesture) => {
        if (Math.abs(g.dx) > TAP_SLOP || Math.abs(g.dy) > TAP_SLOP) moved.current = true;
        pan.setValue({ x: g.dx, y: g.dy });
      },
      onPanResponderRelease: (_e: any, g: Gesture) => {
        pan.flattenOffset();
        const nextX = clamp(offset.current.x + g.dx, minX, maxX);
        const nextY = clamp(offset.current.y + g.dy, minY, maxY);
        offset.current = { x: nextX, y: nextY };
        Animated.spring(pan, {
          toValue: { x: nextX, y: nextY },
          useNativeDriver: false,
          tension: 60,
          friction: 10,
        }).start();
        if (!moved.current) {
          navigation.navigate('AIAssistant', {});
        }
      },
    }),
  ).current;

  return (
    <Animated.View
      {...(responder.panHandlers as any)}
      accessibilityRole="button"
      accessibilityLabel="Open AI Assistant (drag to move)"
      style={[
        styles.container,
        { bottom },
        { transform: pan.getTranslateTransform() } as any,
        style,
      ]}
    >
      <LinearGradient
        colors={[colors.primary.light, colors.primary.main, colors.primary.dark] as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        <Icon name="creation" size={ms(26)} color={colors.common.white} />
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: ms(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default AiAssistantFab;
