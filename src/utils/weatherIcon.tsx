import React from 'react';
import { Image, Text, StyleSheet } from 'react-native';
import { moderateScale as ms } from 'react-native-size-matters';

const EMOJI_MAP: Record<string, string> = {
  '01d': '☀️',
  '01n': '🌙',
  '02d': '🌤️',
  '02n': '☁️',
  '03d': '⛅',
  '03n': '☁️',
  '04d': '☁️',
  '04n': '☁️',
  '09d': '🌧️',
  '09n': '🌧️',
  '10d': '🌧️',
  '10n': '🌧️',
  '11d': '⛈️',
  '11n': '⛈️',
  '13d': '🌨️',
  '13n': '🌨️',
  '50d': '🌫️',
  '50n': '🌫️',
};

export function isWeatherUrl(icon: string | null | undefined): boolean {
  if (!icon) return false;
  return icon.startsWith('//') || icon.startsWith('http');
}

export function getWeatherImageUrl(icon: string): string {
  return icon.startsWith('//') ? `https:${icon}` : icon;
}

export function getWeatherEmoji(iconCode: string | null | undefined): string {
  if (!iconCode) return '🌡️';
  return EMOJI_MAP[iconCode] || '🌡️';
}

interface WeatherIconProps {
  icon: string | null | undefined;
  size?: number;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ icon, size = 22 }) => {
  if (isWeatherUrl(icon)) {
    return (
      <Image
        source={{ uri: getWeatherImageUrl(icon!) }}
        style={{ width: ms(size), height: ms(size) }}
        resizeMode="contain"
      />
    );
  }
  return (
    <Text style={{ fontSize: ms(size - 4) }}>
      {getWeatherEmoji(icon)}
    </Text>
  );
};
