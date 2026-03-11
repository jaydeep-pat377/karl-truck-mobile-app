import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Modal,
  Pressable,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path, Line, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Text, EvaporationProgress, TruckLoader, Icon, AlertModal } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs, responsive, wp, hp, isTablet } from '../../utils/responsive';
import { RootStackParamList } from '../../navigation/types';
import { useWeather, useAlert } from '../../hooks';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type WeatherScreenRouteProp = RouteProp<RootStackParamList, 'Weather'>;

const GRID = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
} as const;

const WEATHER_COLORS = colors.weatherTheme;

const getWeatherIcon = (iconCode: string | null | undefined): string => {
  if (!iconCode) return '🌡️';

  const iconMap: Record<string, string> = {
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

  return iconMap[iconCode] || '🌡️';
};

const WeatherIcon: React.FC<{ size?: number }> = ({ size = 100 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgLinearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors.weatherIcon.sunGold} />
          <Stop offset="100%" stopColor={colors.weatherIcon.sunOrange} />
        </SvgLinearGradient>
        <SvgLinearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={colors.weatherIcon.cloudLight} />
          <Stop offset="100%" stopColor={colors.weatherIcon.cloudBlue} />
        </SvgLinearGradient>
      </Defs>

      <Circle cx="60" cy="30" r="18" fill="url(#sunGrad)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <Line
          key={i}
          x1={60 + Math.cos((angle * Math.PI) / 180) * 22}
          y1={30 + Math.sin((angle * Math.PI) / 180) * 22}
          x2={60 + Math.cos((angle * Math.PI) / 180) * 28}
          y2={30 + Math.sin((angle * Math.PI) / 180) * 28}
          stroke={colors.weatherIcon.sunGold}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}

      <Path
        d="M25 55 C15 55 10 65 15 72 C10 75 12 85 22 85 L70 85 C82 85 85 75 80 68 C88 62 82 50 72 52 C70 42 55 40 48 48 C42 42 28 45 25 55 Z"
        fill="url(#cloudGrad)"
      />

      <Path d="M30 90 L28 98" stroke={colors.weatherIcon.rain} strokeWidth="2" strokeLinecap="round" />
      <Path d="M45 90 L43 98" stroke={colors.weatherIcon.rain} strokeWidth="2" strokeLinecap="round" />
      <Path d="M60 90 L58 98" stroke={colors.weatherIcon.rain} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
};
interface PressureCardProps {
  value: number;
  unit: string;
}

const PressureCard: React.FC<PressureCardProps> = ({ value, unit }) => {
  const svgWidth = responsive(ms(130), ms(160));
  const svgHeight = responsive(ms(95), ms(115));
  const radius = responsive(ms(45), ms(55));
  const strokeWidth = responsive(ms(4), ms(5));
  const centerX = svgWidth / 2;
  const centerY = radius + responsive(ms(8), ms(10));
  const dotRadius = responsive(ms(6), ms(7));

  const minPressure = 29.0;
  const maxPressure = 31.0;
  const normalizedValue = (value - minPressure) / (maxPressure - minPressure);
  const clampedValue = Math.max(0, Math.min(1, normalizedValue));

  const startAngle = 180;
  const endAngle = 0;
  const arcSpan = 180;
  const progressAngle = startAngle - (clampedValue * arcSpan);

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const startX = centerX + Math.cos(toRad(startAngle)) * radius;
  const startY = centerY - Math.sin(toRad(startAngle)) * radius;
  const endX = centerX + Math.cos(toRad(endAngle)) * radius;
  const endY = centerY - Math.sin(toRad(endAngle)) * radius;

  const progressX = centerX + Math.cos(toRad(progressAngle)) * radius;
  const progressY = centerY - Math.sin(toRad(progressAngle)) * radius;

  const backgroundArc = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  const progressEndX = centerX + Math.cos(toRad(progressAngle)) * radius;
  const progressEndY = centerY - Math.sin(toRad(progressAngle)) * radius;
  const progressArc = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${progressEndX} ${progressEndY}`;

  return (
    <WeatherMetricCard title="PRESSURE" titleIcon="arrow-up-down">
      <View style={styles.pressureContent}>
        <Svg width={svgWidth} height={svgHeight}>

          <Path
            d={backgroundArc}
            stroke={WEATHER_COLORS.text.hint + '50'}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />

          {clampedValue > 0 && (
            <Path
              d={progressArc}
              stroke={colors.common.white}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          )}

          <Circle
            cx={progressX}
            cy={progressY}
            r={dotRadius}
            fill={colors.weatherIcon.indicatorDot}
          />

          <SvgText
            x={centerX}
            y={centerY + responsive(ms(5), ms(8))}
            fontSize={responsive(ms(24), ms(28))}
            fontWeight="700"
            fill={WEATHER_COLORS.text.primary}
            textAnchor="middle">
            {value.toFixed(2)}
          </SvgText>

          <SvgText
            x={centerX}
            y={centerY + responsive(ms(22), ms(28))}
            fontSize={responsive(ms(14), ms(16))}
            fill={WEATHER_COLORS.text.primary}
            textAnchor="middle">
            {unit}
          </SvgText>
        </Svg>
      </View>
    </WeatherMetricCard>
  );
};
interface WeatherMetricCardProps {
  title: string;
  titleIcon: string;
  value?: string | number;
  unit?: string;
  description?: string;
  children?: React.ReactNode;
}

const WeatherMetricCard: React.FC<WeatherMetricCardProps> = ({
  title,
  titleIcon,
  value,
  unit,
  description,
  children,
}) => {
  return (
    <View style={[styles.metricCard, { backgroundColor: WEATHER_COLORS.cardBackground, borderColor: WEATHER_COLORS.cardBorder }]}>
      <View style={styles.metricCardHeader}>
        <Icon name={titleIcon} size={ms(14)} color={WEATHER_COLORS.text.hint} />
        <Text style={[styles.metricCardTitle, { color: WEATHER_COLORS.text.hint }]}>
          {title}
        </Text>
      </View>

      {children ? (
        <View style={styles.metricCardContent}>
          {children}
        </View>
      ) : (
        <View style={styles.metricCardValueContainer}>
          <View style={styles.metricCardValueRow}>
            <Text style={[styles.metricCardValue, { color: WEATHER_COLORS.text.primary }]}>
              {value}
            </Text>
            {unit && (
              <Text style={[styles.metricCardUnit, { color: WEATHER_COLORS.text.primary }]}>
                {unit}
              </Text>
            )}
          </View>
        </View>
      )}

      {description && (
        <Text style={[styles.metricCardDescription, { color: WEATHER_COLORS.text.secondary }]} numberOfLines={2}>
          {description}
        </Text>
      )}
    </View>
  );
};

interface ConcreteTempCardProps {
  value: number;
  description: string;
}

const ConcreteTempCard: React.FC<ConcreteTempCardProps> = ({ value, description }) => {
  return (
    <WeatherMetricCard
      title="CONCRETE"
      titleIcon="cube-outline"
      description={description}
    >
      <View style={styles.concreteContent}>
        <View style={styles.concreteValueContainer}>
          <Text style={[styles.concreteValue, { color: WEATHER_COLORS.text.primary }]}>
            --
          </Text>
          <Text style={[styles.concreteUnit, { color: WEATHER_COLORS.text.primary }]}>
            °
          </Text>
        </View>
      </View>
    </WeatherMetricCard>
  );
};

interface WindCardProps {
  direction: string;
  speed: number;
  unit: string;
}

const WindCard: React.FC<WindCardProps> = ({ direction, speed, unit }) => {
  const size = responsive(ms(60), ms(80));
  const center = size / 2;
  const radius = size / 2 - responsive(8, 10);

  const directionAngles: Record<string, number> = {
    'N': 0, 'NE': 45, 'E': 90, 'SE': 135,
    'S': 180, 'SW': 225, 'W': 270, 'NW': 315,
  };
  const angle = directionAngles[direction] || 0;

  const needleLength = radius - 4;
  const needleAngleRad = ((angle - 90) * Math.PI) / 180;
  const needleX = center + Math.cos(needleAngleRad) * needleLength;
  const needleY = center + Math.sin(needleAngleRad) * needleLength;

  const directions = ['N', 'E', 'S', 'W'];
  const offset = responsive(6, 8);
  const directionPositions = [
    { x: center, y: offset + 4 },
    { x: size - offset, y: center + 3 },
    { x: center, y: size - offset + 2 },
    { x: offset, y: center + 3 },
  ];

  return (
    <WeatherMetricCard title="WIND" titleIcon="weather-windy">
      <View style={styles.windContent}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={WEATHER_COLORS.text.hint + '40'}
            strokeWidth="1.5"
            fill="transparent"
          />

          <Circle
            cx={center}
            cy={center}
            r={radius - 10}
            stroke={WEATHER_COLORS.text.hint + '30'}
            strokeWidth="1"
            fill="transparent"
            strokeDasharray="2 2"
          />

          {directions.map((dir, i) => (
            <SvgText
              key={dir}
              x={directionPositions[i].x}
              y={directionPositions[i].y}
              fontSize={ms(8)}
              fontWeight={dir === 'N' ? 'bold' : 'normal'}
              fill={dir === 'N' ? colors.error.light : WEATHER_COLORS.text.hint}
              textAnchor="middle">
              {dir}
            </SvgText>
          ))}

          <Line
            x1={center}
            y1={center}
            x2={needleX}
            y2={needleY}
            stroke={colors.common.white}
            strokeWidth="2"
            strokeLinecap="round"
          />

          <Circle cx={center} cy={center} r="3" fill={colors.common.white} />
        </Svg>

        <View style={styles.windSpeedContainer}>
          <Text style={[styles.windSpeedValue, { color: WEATHER_COLORS.text.primary }]}>
            {speed}
          </Text>
          <Text style={[styles.windSpeedUnit, { color: WEATHER_COLORS.text.secondary }]}>
            {unit}
          </Text>
        </View>
      </View>
    </WeatherMetricCard>
  );
};
interface DewPointCardProps {
  value: number;
  description: string;
}

const DewPointCard: React.FC<DewPointCardProps> = ({ value, description }) => {
  return (
    <WeatherMetricCard
      title="DEW POINT"
      titleIcon="thermometer-low"
      description={description}
    >
      <View style={styles.simpleContent}>
        <View style={styles.simpleValueContainer}>
          <Text style={[styles.simpleValue, { color: WEATHER_COLORS.text.primary }]}>
            {value}
          </Text>
          <Text style={[styles.simpleUnit, { color: WEATHER_COLORS.text.primary }]}>
            ° F
          </Text>
        </View>
      </View>
    </WeatherMetricCard>
  );
};
interface HumidityCardProps {
  value: number;
  description: string;
}

const HumidityCard: React.FC<HumidityCardProps> = ({ value, description }) => {
  return (
    <WeatherMetricCard
      title="HUMIDITY"
      titleIcon="water-percent"
      description={description}
    >
      <View style={styles.humidityContent}>
        <View style={styles.humidityValueContainer}>
          <Text style={[styles.humidityValue, { color: WEATHER_COLORS.text.primary }]}>
            {value}
          </Text>
          <Text style={[styles.humidityUnit, { color: WEATHER_COLORS.text.primary }]}>
            %
          </Text>
        </View>
      </View>
    </WeatherMetricCard>
  );
};

interface RecommendationChipProps {
  label: string;
  color: string;
}

const RecommendationChip: React.FC<RecommendationChipProps> = ({ label, color }) => {
  return (
    <View style={[styles.recommendationChip, { backgroundColor: color }]}>
      <Text
        style={styles.recommendationChipText}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );
};

export const WeatherScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<WeatherScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const { alertState, hideAlert, showInfo } = useAlert();

  const { orderCode = '', orderDate = '', orderStatus = 'Pending', startTime = '--:--' } = route.params ?? {};

  const [menuVisible, setMenuVisible] = useState(false);

  const {
    weatherData,
    orderInfo,
    isLoading,
    isRefetching,
    refetch,
  } = useWeather({
    order_code: orderCode,
    order_date: orderDate,
  });

  const weather = useMemo(() => {
    if (!weatherData) {
      return null;
    }

    let evaporationStatus: 'Low' | 'Moderate' | 'High' = 'Low';
    let evaporationProgress = 15;
    if (weatherData.evaporation_rate >= 0.3) {
      evaporationStatus = 'High';
      evaporationProgress = 85;
    } else if (weatherData.evaporation_rate >= 0.15) {
      evaporationStatus = 'Moderate';
      evaporationProgress = 50;
    }

    return {
      location: 'Weather Location',
      orderNo: orderCode,
      orderDate: orderDate,
      temperature: weatherData.temperature_fahrenheit,
      temperatureUnit: 'F',
      condition: weatherData.weather_condition,
      iconCode: weatherData.weather_icon,
      maxTemp: weatherData.temperature_max_fahrenheit,
      minTemp: weatherData.temperature_min_fahrenheit,
      evaporation: {
        value: weatherData.evaporation_rate,
        status: evaporationStatus,
        description: `${weatherData.evaporation_level} evaporation rate`,
        progress: evaporationProgress,
      },
      concreteTemp: {
        value: weatherData.concrete_temperature_fahrenheit ?? weatherData.temperature_fahrenheit,
        description: weatherData.concrete_temperature_fahrenheit
          ? 'Measured concrete temperature'
          : 'Similar to\nthe actual\ntemperature',
      },
      wind: {
        direction: weatherData.wind_direction,
        speed: weatherData.wind_speed_mph,
        unit: 'mph',
      },
      pressure: {
        value: weatherData.pressure_inhg,
        unit: 'in',
      },
      dewPoint: {
        value: weatherData.dew_point_fahrenheit,
        description: 'Dew point temperature',
      },
      humidity: {
        value: weatherData.humidity,
        description: `The dew point is ${Math.round(weatherData.dew_point_fahrenheit)}° right now.`,
      },
      productRecommendations: [
        { id: '1', label: 'Hot Weather Mix', color: colors.productChip.thermalCracking },
        { id: '2', label: 'Retarder Recommended', color: colors.productChip.plasticCracking },
      ],
    };
  }, [weatherData, orderCode, orderDate]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEvaporationPress = useCallback(() => {
    navigation.navigate('EvaporationList', {
      locationName: weather.location,
      date: weather.orderDate,
      orderCode: weather.orderNo,
      currentEvaporation: {
        value: weather.evaporation.value,
        status: weather.evaporation.status,
        description: weather.evaporation.description,
      },
      weatherData: {
        humidity: weather.humidity.value,
        windSpeed: weather.wind.speed,
        windDirection: weather.wind.direction,
        temperature: weather.temperature,
        temperatureUnit: weather.temperatureUnit,
        pressure: weather.pressure.value,
        pressureUnit: weather.pressure.unit,
        dewPoint: weather.dewPoint.value,
        concreteTemp: weather.concreteTemp.value,
        condition: weather.condition,
        cloudsPercentage: weatherData?.clouds_percentage ?? 0,
        visibility: weatherData?.visibility_meters ?? 0,
      },
    });
  }, [navigation, weather, weatherData]);

  const handleMenuToggle = useCallback(() => {
    setMenuVisible(prev => !prev);
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Weather Update for ${weather.location}\nTemperature: ${weather.temperature}°${weather.temperatureUnit}\nCondition: ${weather.condition}\nMax: ${weather.maxTemp}° | Min: ${weather.minTemp}°`,
        title: 'Weather Update',
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  }, [weather]);

  const handleViewForecast = useCallback(() => {
    setMenuVisible(false);
    showInfo('7-Day Forecast', 'Extended forecast feature coming soon!');
  }, [showInfo]);

  const handleSettings = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate('Main', { screen: 'Settings' });
  }, [navigation]);

  const menuItems = [
    { id: '1', icon: 'share-variant', label: 'Share Weather', onPress: handleShare },
    { id: '2', icon: 'calendar-week', label: 'View 7-Day Forecast', onPress: handleViewForecast },
    { id: '3', icon: 'cog-outline', label: 'Settings', onPress: handleSettings },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: WEATHER_COLORS.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={WEATHER_COLORS.background} />
        <LinearGradient
          colors={[...WEATHER_COLORS.gradient.colors] as string[]}
          locations={[...WEATHER_COLORS.gradient.locations] as number[]}
          style={styles.gradientBackground}
        />
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
              <Icon name="chevron-left" size={24} color={colors.common.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Weather Update</Text>
            <View style={styles.headerActions}>
              <View style={styles.headerActionBtn} />
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer} pointerEvents="box-none">
          <TruckLoader size={120} message="Loading weather..." color="light" />
        </View>
      </View>
    );
  }

  if (!weather) {
    return (
      <View style={[styles.container, { backgroundColor: WEATHER_COLORS.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={WEATHER_COLORS.background} />
        <LinearGradient
          colors={[...WEATHER_COLORS.gradient.colors] as string[]}
          locations={[...WEATHER_COLORS.gradient.locations] as number[]}
          style={styles.gradientBackground}
        />
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
            <Icon name="chevron-left" size={24} color={colors.common.white} />
          </TouchableOpacity>
          <Text style={styles.errorText}>Unable to load weather data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: WEATHER_COLORS.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={WEATHER_COLORS.background} />

      <LinearGradient
        colors={[...WEATHER_COLORS.gradient.colors] as string[]}
        locations={[...WEATHER_COLORS.gradient.locations] as number[]}
        style={styles.gradientBackground}
      />


      <View style={[styles.staticHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
            <Icon name="chevron-left" size={24} color={colors.common.white} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Weather Update</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionBtn} onPress={onRefresh} activeOpacity={0.7}>
              {isRefetching ? (
                <ActivityIndicator size="small" color={colors.common.white} />
              ) : (
                <Icon name="refresh" size={20} color={colors.common.white} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionBtn} onPress={handleShare} activeOpacity={0.7}>
              <Icon name="share-variant" size={20} color={colors.common.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>


      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + GRID.xl * 2 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.common.white}
            colors={[colors.primary.main, colors.secondary.main]}
            progressBackgroundColor={isDark ? themeColors.cardElevated : colors.common.white}
          />
        }>
        <View style={styles.headerContent}>
          <View style={styles.locationOrderRow}>
            <View style={styles.locationContainer}>
              <Icon name="map-marker" size={16} color={colors.common.white} />
              <Text style={styles.locationText} numberOfLines={2} ellipsizeMode="tail">
                {weather.location}
              </Text>
            </View>

            <View style={styles.orderInfoContainer}>
              <Text style={styles.orderInfoText}>Order No: {weather.orderNo}</Text>
              <Text style={styles.orderInfoText}>Date: {weather.orderDate}</Text>
            </View>
          </View>
          <View style={styles.weatherDisplay}>
            <View style={styles.weatherIconContainer}>
              <Text style={styles.weatherEmoji}>
                {getWeatherIcon(weather.iconCode)}
              </Text>
            </View>

            <View style={styles.temperatureSection}>
              <Text style={styles.temperatureText}>
                {weather.temperature}° {weather.temperatureUnit}
              </Text>
              <Text style={styles.conditionText}>{weather.condition}</Text>
              <Text style={styles.minMaxText}>
                Max: {weather.maxTemp}°  Min: {weather.minTemp}°
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardsContainer}>
          <View style={[styles.recommendationsSection, { backgroundColor: WEATHER_COLORS.cardBackground, borderColor: WEATHER_COLORS.cardBorder }]}>
            <Text style={[styles.recommendationsTitle, { color: WEATHER_COLORS.text.primary }]}>
              Product Recommendations
            </Text>

            <View style={styles.recommendationsRow}>
              {weather.productRecommendations.map((item) => (
                <View key={item.id} style={styles.recommendationChipWrapper}>
                  <RecommendationChip
                    label={item.label}
                    color={item.color}
                  />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.cardsGrid}>
            <View style={styles.cardsRow}>
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  style={styles.cardTouchable}
                  onPress={handleEvaporationPress}
                  activeOpacity={0.8}>
                  <EvaporationProgress evaporation={weather.evaporation} />
                </TouchableOpacity>
              </View>
              <View style={styles.cardWrapper}>
                <View style={styles.cardTouchable}>
                  <ConcreteTempCard
                    value={weather.concreteTemp.value}
                    description={weather.concreteTemp.description}
                  />
                </View>
              </View>
            </View>
            <View style={styles.cardsRow}>
              <View style={styles.cardWrapper}>
                <View style={styles.cardTouchable}>
                  <WindCard
                    direction={weather.wind.direction}
                    speed={weather.wind.speed}
                    unit={weather.wind.unit}
                  />
                </View>
              </View>
              <View style={styles.cardWrapper}>
                <View style={styles.cardTouchable}>
                  <PressureCard
                    value={weather.pressure.value}
                    unit={weather.pressure.unit}
                  />
                </View>
              </View>
            </View>
            <View style={styles.cardsRow}>
              <View style={styles.cardWrapper}>
                <View style={styles.cardTouchable}>
                  <DewPointCard
                    value={weather.dewPoint.value}
                    description={weather.dewPoint.description}
                  />
                </View>
              </View>
              <View style={styles.cardWrapper}>
                <View style={styles.cardTouchable}>
                  <HumidityCard
                    value={weather.humidity.value}
                    description={weather.humidity.description}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleMenuToggle}>
        <Pressable style={styles.modalOverlay} onPress={handleMenuToggle}>
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={[styles.menuTitle, { color: WEATHER_COLORS.text.primary }]}>Menu</Text>
              <TouchableOpacity
                style={styles.menuCloseBtn}
                onPress={handleMenuToggle}
                activeOpacity={0.7}>
                <Icon name="close" size={ms(18)} color={WEATHER_COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && styles.menuItemBorder,
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}>
                <View style={styles.menuItemIcon}>
                  <Icon name={item.icon} size={ms(18)} color={WEATHER_COLORS.text.secondary} />
                </View>
                <Text style={[styles.menuItemLabel, { color: WEATHER_COLORS.text.primary }]}>
                  {item.label}
                </Text>
                <Icon name="chevron-right" size={ms(18)} color={WEATHER_COLORS.text.hint} />
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <AlertModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  staticHeader: {
    paddingHorizontal: GRID.md,
  },
  headerContent: {
    paddingHorizontal: GRID.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: GRID.sm,
    paddingBottom: GRID.sm,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: colors.common.white + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(18),
    color: colors.common.white,
  },
  headerActions: {
    flexDirection: 'row',
    gap: GRID.sm,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: colors.common.white + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationOrderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: GRID.lg,
    gap: GRID.md,
  },
  locationContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: GRID.xs,
    maxWidth: '60%',
  },
  locationText: {
    flex: 1,
    flexShrink: 1,
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
    color: colors.common.white,
    lineHeight: ms(20),
  },
  orderInfoContainer: {
    alignItems: 'flex-end',
    flexShrink: 0,
    minWidth: ms(100),
  },
  orderInfoText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    color: colors.common.white + 'CC',
    lineHeight: ms(16),
  },
  weatherDisplay: {
    alignItems: 'center',
    paddingVertical: GRID.md,
  },
  weatherIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ms(100),
    height: ms(100),
  },
  weatherEmoji: {
    fontSize: ms(72),
    lineHeight: ms(100),
    textAlign: 'center',
  },
  temperatureSection: {
    alignItems: 'center',
    marginTop: GRID.md,
  },
  temperatureText: {
    fontFamily: fontFamily.bold,
    fontSize: responsive(ms(48), ms(64)),
    lineHeight: responsive(ms(50), ms(68)),
    color: colors.common.white,
    includeFontPadding: false,
  },
  conditionText: {
    fontFamily: fontFamily.medium,
    fontSize: responsive(ms(16), ms(22)),
    color: colors.common.white + 'DD',
    marginTop: GRID.xs,
  },
  minMaxText: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(13), ms(18)),
    color: colors.common.white + 'BB',
    marginTop: GRID.xs,
  },
  cardsContainer: {
    padding: GRID.md,
  },
  recommendationsSection: {
    borderRadius: RADIUS.xl,
    padding: GRID.md,
    marginBottom: GRID.md,
    borderWidth: 1,
  },
  recommendationsTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    marginBottom: GRID.sm,
  },
  recommendationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
  },
  recommendationChipWrapper: {
    flex: 1,
  },
  recommendationsChipsContainer: {
    flex: 1,
    flexShrink: 1,
  },
  recommendationsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
    paddingVertical: ms(2),
  },
  recommendationsArrow: {
    width: ms(36),
    height: ms(36),
    borderRadius: RADIUS.full,
    backgroundColor: colors.productChip.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: GRID.sm,
    flexShrink: 0,
  },
  recommendationChip: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    alignItems: 'center',
  },
  recommendationChipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    color: colors.common.white,
    textAlign: 'center',
  },
  cardsGrid: {
    gap: ms(10),
    borderRadius: RADIUS.lg,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: '48.5%',
    height: responsive(ms(140), ms(180)),
  },
  cardTouchable: {
    flex: 1,
    position: 'relative',
  },
  navigateIndicator: {
    position: 'absolute',
    top: GRID.sm,
    right: GRID.sm,
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: WEATHER_COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: GRID.sm,
    minHeight: ms(130),
    borderWidth: 1,
  },
  weatherCardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
    letterSpacing: 0.5,
    marginBottom: GRID.xs,
  },
  weatherCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  weatherCardCustom: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherCardIcon: {
    marginBottom: GRID.xs,
  },
  weatherCardValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(22),
  },
  weatherCardSubtitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    marginTop: GRID.xs,
  },
  weatherCardDescription: {
    fontFamily: fontFamily.regular,
    fontSize: ms(14),
    lineHeight: ms(18),
    marginTop: GRID.xs,
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  windSpeedText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: WEATHER_COLORS.text.primary,
    marginTop: GRID.xs,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCard: {
    borderRadius: RADIUS.lg,
    padding: responsive(ms(12), ms(16)),
    height: responsive(ms(140), ms(180)),
    borderWidth: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  metricCardTitle: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCardValueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCardValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metricCardValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(36), ms(44)),
    lineHeight: responsive(ms(42), ms(50)),
  },
  metricCardUnit: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(16), ms(20)),
    marginTop: ms(4),
    marginLeft: ms(2),
  },
  metricCardDescription: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(11), ms(14)),
    lineHeight: responsive(ms(15), ms(18)),
    marginTop: ms(8),
  },
  concreteContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concreteValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  concreteValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(40), ms(50)),
    lineHeight: responsive(ms(46), ms(56)),
  },
  concreteUnit: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(20), ms(26)),
    marginTop: ms(4),
  },
  windContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(4),
  },
  windSpeedContainer: {
    alignItems: 'center',
    marginTop: ms(6),
  },
  windSpeedValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(18), ms(24)),
    lineHeight: responsive(ms(22), ms(28)),
  },
  windSpeedUnit: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(11), ms(14)),
    marginTop: ms(2),
  },
  pressureContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  simpleValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(40), ms(50)),
    lineHeight: responsive(ms(46), ms(56)),
  },
  simpleUnit: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(20), ms(26)),
    marginTop: ms(4),
  },
  humidityContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(4),
  },
  humidityValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  humidityValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(32), ms(42)),
    lineHeight: responsive(ms(38), ms(48)),
  },
  humidityUnit: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(16), ms(22)),
    marginTop: ms(4),
  },
  evaporationContainer: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  evaporationValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(24),
    lineHeight: ms(28),
  },
  evaporationLevel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
    marginTop: 2,
    marginBottom: GRID.sm,
  },
  progressBarWrapper: {
    position: 'relative',
    paddingVertical: GRID.xs,
  },
  segmentedBarContainer: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barSegment: {
    flex: 1,
    height: '100%',
  },
  barSegmentFirst: {
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  barSegmentLast: {
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  indicatorDot: {
    position: 'absolute',
    top: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.common.white,
    marginLeft: -7,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  indicatorDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary.main,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: WEATHER_COLORS.menu.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: GRID.lg,
  },
  menuContainer: {
    width: '100%',
    maxWidth: 300,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: WEATHER_COLORS.menu.border,
    backgroundColor: WEATHER_COLORS.menu.background,
    shadowColor: WEATHER_COLORS.menu.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GRID.md,
    paddingVertical: ms(12),
    borderBottomWidth: 1,
    borderBottomColor: WEATHER_COLORS.menu.divider,
  },
  menuTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
  },
  menuCloseBtn: {
    width: ms(28),
    height: ms(28),
    borderRadius: RADIUS.full,
    backgroundColor: WEATHER_COLORS.menu.iconBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.md,
    paddingVertical: ms(12),
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: WEATHER_COLORS.menu.divider,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: WEATHER_COLORS.menu.iconBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GRID.sm,
  },
  menuItemLabel: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(16),
    color: colors.common.white,
    marginTop: GRID.lg,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: GRID.md,
    paddingHorizontal: GRID.lg,
    paddingVertical: GRID.sm,
    backgroundColor: colors.common.white + '20',
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
    color: colors.common.white,
  },
});

export default WeatherScreen;
