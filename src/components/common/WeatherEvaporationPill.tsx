import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from './Text';
import { WeatherCondition, WeatherData } from '../../types';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms } from '../../utils/responsive';

interface WeatherEvaporationPillProps {
  weather?: WeatherData;
  evaporationRate?: number | null;
  onPress?: () => void;
  isLoading?: boolean;
  size?: 'small' | 'medium';
  showEvaporationRate?: boolean;
}

const EVAPORATION_THRESHOLDS = {
  LOW: 0.1,
  MEDIUM: 0.25,

};

type EvaporationRiskLevel = 'low' | 'medium' | 'high' | 'unknown';

const getEvaporationRiskLevel = (rate: number | null | undefined): EvaporationRiskLevel => {
  if (rate === null || rate === undefined) return 'unknown';
  if (rate < EVAPORATION_THRESHOLDS.LOW) return 'low';
  if (rate < EVAPORATION_THRESHOLDS.MEDIUM) return 'medium';
  return 'high';
};

const riskLevelColors: Record<EvaporationRiskLevel, { background: string; text: string; icon: string }> = {
  low: {
    background: colors.dashboard.statGreen,
    text: colors.common.white,
    icon: colors.common.white,
  },
  medium: {
    background: colors.dashboard.statYellow,
    text: colors.common.black,
    icon: colors.common.black,
  },
  high: {
    background: colors.dashboard.statRed,
    text: colors.common.white,
    icon: colors.common.white,
  },
  unknown: {
    background: colors.evaporationPill.unknownBg,
    text: colors.common.white,
    icon: colors.common.white,
  },
};

const weatherIcons: Record<WeatherCondition, string> = {
  sunny: 'weather-sunny',
  partly_cloudy: 'weather-partly-cloudy',
  cloudy: 'weather-cloudy',
  rain: 'weather-rainy',
  storm: 'weather-lightning-rainy',
  snow: 'weather-snowy',
  fog: 'weather-fog',
};

const weatherLabels: Record<WeatherCondition, string> = {
  sunny: 'Sunny',
  partly_cloudy: 'Partly Cloudy',
  cloudy: 'Cloudy',
  rain: 'Rainy',
  storm: 'Storm',
  snow: 'Snowy',
  fog: 'Foggy',
};

export const WeatherEvaporationPill: React.FC<WeatherEvaporationPillProps> = ({
  weather,
  evaporationRate,
  onPress,
  isLoading = false,
  size = 'small',
  showEvaporationRate = true,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  if (!weather && !isLoading) {
    return null;
  }

  const riskLevel = getEvaporationRiskLevel(evaporationRate);
  const riskColors = riskLevelColors[riskLevel];

  const iconSize = size === 'small' ? ms(12) : ms(14);
  const fontSize = size === 'small' ? ms(10) : ms(11);
  const paddingH = size === 'small' ? ms(8) : ms(10);
  const paddingV = size === 'small' ? ms(4) : ms(6);
  const borderRadius = size === 'small' ? ms(12) : ms(14);

  const iconName = weather ? weatherIcons[weather.condition] : 'weather-cloudy';
  const weatherLabel = weather ? weatherLabels[weather.condition] : '';

  const formatTemperature = (temp: number, unit: 'C' | 'F') => {
    return `${Math.round(temp)}°${unit}`;
  };

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: riskColors.background,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
          borderRadius: borderRadius,
        },
      ]}>
      {isLoading ? (
        <ActivityIndicator size="small" color={riskColors.text} style={styles.loader} />
      ) : (
        <>
          <Icon
            name={iconName}
            size={iconSize}
            color={riskColors.icon}
          />
          {weather && (
            <>
              <Text
                style={[
                  styles.weatherText,
                  { color: riskColors.text, fontSize },
                ]}
                numberOfLines={1}>
                {formatTemperature(weather.temperature, weather.temperatureUnit)}
              </Text>
              {showEvaporationRate && evaporationRate !== null && evaporationRate !== undefined && (
                <>
                  <View style={[styles.divider, { backgroundColor: riskColors.text + '40' }]} />
                  <Text
                    style={[
                      styles.evaporationText,
                      { color: riskColors.text, fontSize },
                    ]}
                    numberOfLines={1}>
                    ER: {evaporationRate.toFixed(2)}
                  </Text>
                </>
              )}
            </>
          )}
        </>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={isLoading}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [
          pressed && styles.pressed,
        ]}>
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    shadowColor: colors.common.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  weatherText: {
    fontFamily: fontFamily.semiBold,
  },
  evaporationText: {
    fontFamily: fontFamily.semiBold,
  },
  divider: {
    width: 1,
    height: ms(12),
    marginHorizontal: ms(2),
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  loader: {
    transform: [{ scale: 0.6 }],
  },
});

export default WeatherEvaporationPill;
