/**
 * WeatherBadge Component
 * Compact, tappable weather indicator for order cards.
 * Displays weather icon and temperature in a single line.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from './Text';
import { WeatherCondition, WeatherData } from '../../types';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms } from '../../utils/responsive';

interface WeatherBadgeProps {
  weather?: WeatherData;
  onPress?: () => void;
  isLoading?: boolean;
  size?: 'small' | 'medium';
}

// Weather condition to icon mapping
const weatherIcons: Record<WeatherCondition, string> = {
  sunny: 'weather-sunny',
  partly_cloudy: 'weather-partly-cloudy',
  cloudy: 'weather-cloudy',
  rain: 'weather-rainy',
  storm: 'weather-lightning-rainy',
  snow: 'weather-snowy',
  fog: 'weather-fog',
};

// Weather condition to color mapping (muted colors)
const weatherColors: Record<WeatherCondition, string> = {
  sunny: colors.weatherBadge.sunny,
  partly_cloudy: colors.weatherBadge.partlyCloudy,
  cloudy: colors.weatherBadge.cloudy,
  rain: colors.weatherBadge.rain,
  storm: colors.weatherBadge.storm,
  snow: colors.weatherBadge.snow,
  fog: colors.weatherBadge.fog,
};

export const WeatherBadge: React.FC<WeatherBadgeProps> = ({
  weather,
  onPress,
  isLoading = false,
  size = 'small',
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  // Don't render if no weather data and not loading
  if (!weather && !isLoading) {
    return null;
  }

  const iconSize = size === 'small' ? ms(14) : ms(16);
  const fontSize = size === 'small' ? ms(10) : ms(11);

  const iconName = weather ? weatherIcons[weather.condition] : 'weather-cloudy';
  const iconColor = weather ? weatherColors[weather.condition] : themeColors.text.hint;

  const formatTemperature = (temp: number, unit: 'C' | 'F') => {
    return `${Math.round(temp)}°${unit}`;
  };

  const content = (
    <View style={[styles.container, size === 'medium' && styles.containerMedium]}>
      {isLoading ? (
        <ActivityIndicator size="small" color={themeColors.text.hint} style={styles.loader} />
      ) : (
        <>
          <Icon
            name={iconName}
            size={iconSize}
            color={iconColor}
          />
          {weather && (
            <Text
              style={[
                styles.temperature,
                { color: themeColors.text.secondary, fontSize },
              ]}>
              {formatTemperature(weather.temperature, weather.temperatureUnit)}
            </Text>
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
          styles.pressable,
          pressed && styles.pressed,
        ]}>
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  pressable: {
    borderRadius: ms(4),
    minWidth: ms(44), // Minimum touch target
    minHeight: ms(24),
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.primary.main + '10',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(3),
    paddingHorizontal: ms(4),
    paddingVertical: ms(2),
  },
  containerMedium: {
    gap: ms(4),
    paddingHorizontal: ms(6),
    paddingVertical: ms(3),
  },
  temperature: {
    fontFamily: fontFamily.medium,
  },
  loader: {
    transform: [{ scale: 0.6 }],
  },
});

export default WeatherBadge;
