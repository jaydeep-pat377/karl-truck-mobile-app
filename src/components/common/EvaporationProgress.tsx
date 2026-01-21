import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { ms, vs, spacing, borderRadius, responsive } from '../../utils/responsive';
import { fontFamily } from '@theme/typography';

const WEATHER_COLORS = colors.weatherTheme;

type EvaporationProps = {
  evaporation: {
    value: number;
    status: 'Low' | 'Moderate' | 'High';
    description: string;
    progress: number;
  };
};

const EvaporationProgress: React.FC<EvaporationProps> = ({ evaporation }) => {
  const indicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(indicatorAnim, {
      toValue: evaporation?.progress || 0,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [evaporation, indicatorAnim]);

  const indicatorPosition = indicatorAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Icon name="water-outline" size={ms(14)} color={WEATHER_COLORS.text.hint} />
        <Text style={styles.title}>EVAPORATION</Text>
      </View>

      <Text style={styles.value}>
        {evaporation?.value ?? 0}
      </Text>

      <Text style={styles.status}>
        {evaporation?.status}
      </Text>

      <View style={styles.progressBarWrapper}>
        <LinearGradient
          colors={['#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#F44336']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradientBar}
        />

        <Animated.View
          style={[
            styles.indicator,
            {
              left: indicatorPosition,
            },
          ]}>
          <View style={styles.indicatorDot} />
        </Animated.View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {evaporation?.description}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: WEATHER_COLORS.cardBackground,
    borderRadius: borderRadius.lg,
    padding: responsive(ms(10), ms(14)),
    height: responsive(ms(140), ms(180)),
    borderWidth: 1,
    borderColor: WEATHER_COLORS.cardBorder,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  title: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    letterSpacing: ms(0.8),
    color: WEATHER_COLORS.text.hint,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: responsive(ms(28), ms(36)),
    fontFamily: fontFamily.semiBold,
    color: WEATHER_COLORS.text.primary,
    lineHeight: responsive(ms(32), ms(42)),
    textAlign: 'center',
    marginTop: responsive(ms(2), ms(6)),
  },
  status: {
    fontSize: responsive(ms(11), ms(14)),
    fontFamily: fontFamily.medium,
    color: WEATHER_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: responsive(ms(4), ms(8)),
  },
  progressBarWrapper: {
    position: 'relative',
    height: responsive(vs(14), vs(18)),
    justifyContent: 'center',
    marginBottom: responsive(ms(4), ms(8)),
  },
  gradientBar: {
    height: responsive(vs(6), vs(8)),
    borderRadius: borderRadius.xs,
  },
  indicator: {
    position: 'absolute',
    top: responsive(vs(2), vs(3)),
    marginLeft: responsive(ms(-6), ms(-8)),
  },
  indicatorDot: {
    width: responsive(ms(12), ms(16)),
    height: responsive(ms(12), ms(16)),
    borderRadius: responsive(ms(6), ms(8)),
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(1) },
    shadowOpacity: 0.3,
    shadowRadius: ms(2),
    elevation: 3,
  },
  description: {
    fontSize: responsive(ms(10), ms(13)),
    fontFamily: fontFamily.regular,
    color: WEATHER_COLORS.text.secondary,
    lineHeight: responsive(ms(13), ms(17)),
  },
});

export default EvaporationProgress;
