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
  InteractionManager,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path, Line, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Text, EvaporationProgress, TruckLoader, Icon, AlertModal, BottomSheet } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs, responsive, wp, hp, isTablet } from '../../utils/responsive';
import { RootStackParamList } from '../../navigation/types';
import { useWeather, useAlert } from '../../hooks';
import { WeatherIcon as SharedWeatherIcon } from '../../utils/weatherIcon';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useTranslation } from 'react-i18next';
import { axiosInstance } from '../../api/axiosInstance';

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
  const { t } = useTranslation();
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
    <WeatherMetricCard title={t('weather.pressure').toUpperCase()} titleIcon="arrow-up-down">
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
        <View style={styles.metricCardIconWrap}>
          <Icon name={titleIcon} size={ms(14)} color={WEATHER_COLORS.text.hint} />
        </View>
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

  const { t } = useTranslation();
  return (
    <WeatherMetricCard title={t('weather.wind').toUpperCase()} titleIcon="weather-windy">
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
  const { t } = useTranslation();
  return (
    <WeatherMetricCard
      title={t('weather.dewPoint').toUpperCase()}
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
  const { t } = useTranslation();
  return (
    <WeatherMetricCard
      title={t('weather.humidity').toUpperCase()}
      titleIcon="water-percent"
      description={description}
    >
      <View style={styles.simpleContent}>
        <View style={styles.simpleValueContainer}>
          <Text style={[styles.simpleValue, { color: WEATHER_COLORS.text.primary }]}>
            {value}
          </Text>
          <Text style={[styles.simpleUnit, { color: WEATHER_COLORS.text.primary }]}>
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

interface ConcreteEvaporationCardProps {
  rate?: number | null;
  level?: string | null;
  tempSource?: string | null;
  isEstimated?: boolean | null;
  plantDefaultTemperature?: number | null;
  plantConcreteTemperature?: number | null;
  plantStatusType?: 0 | 1 | null;
  onMorePress?: () => void;
}

const CONCRETE_EVAP_COLORS: Record<string, string> = {
  Low: colors.evaporationSeverity.low,
  Moderate: colors.evaporationSeverity.moderate,
  High: colors.evaporationSeverity.high,
  Critical: colors.evaporationSeverity.critical,
};

const ConcreteEvaporationCard: React.FC<ConcreteEvaporationCardProps> = ({
  rate, level, tempSource, isEstimated,
  plantDefaultTemperature, plantConcreteTemperature, plantStatusType,
  onMorePress,
}) => {
  const { t } = useTranslation();
  const hasData = rate != null && level;
  const levelColor = hasData ? (CONCRETE_EVAP_COLORS[level] || CONCRETE_EVAP_COLORS.Low) : WEATHER_COLORS.text.hint;
  const progress = hasData ? (level === 'Low' ? 25 : level === 'Moderate' ? 50 : level === 'High' ? 75 : 100) : 0;
  const isNonVerifi = tempSource != null && !['Discharge', 'Arrival', 'Leave Plant'].includes(tempSource);
  const showPlantConfig = isNonVerifi || (!hasData && (plantDefaultTemperature != null || plantConcreteTemperature != null));

  return (
    <View style={[styles.metricCard, { backgroundColor: WEATHER_COLORS.cardBackground, borderColor: WEATHER_COLORS.cardBorder }]}>
      <View style={styles.metricCardHeader}>
        <View style={styles.metricCardIconWrap}>
          <Icon name="water-outline" size={ms(14)} color={WEATHER_COLORS.text.hint} />
        </View>
        <Text style={[styles.metricCardTitle, { color: WEATHER_COLORS.text.hint }]}>
          {t('weather.concreteEvap').toUpperCase()}
        </Text>
      </View>

      <Text style={[styles.concreteEvapValue, { color: WEATHER_COLORS.text.primary }]}>
        {hasData ? rate.toFixed(4) : t('common.notAvailable')}
      </Text>

      {hasData ? (
        <View style={styles.concreteEvapLevelBadge}>
          <View style={[styles.concreteEvapDot, { backgroundColor: levelColor }]} />
          <Text style={[styles.concreteEvapLevelText, { color: levelColor }]}>
            {level}
          </Text>
          <Text style={[styles.concreteEvapUnitText, { color: WEATHER_COLORS.text.secondary }]}>
            {t('units.kgm2hr')}
          </Text>
        </View>
      ) : null}

      <View style={styles.concreteEvapBarTrack}>
        <View style={[styles.concreteEvapBarFill, { width: `${progress}%`, backgroundColor: levelColor }]} />
      </View>

      <View style={styles.concreteEvapDescRow}>
        <Text style={[styles.concreteEvapDesc, { color: WEATHER_COLORS.text.secondary, flex: 1, flexShrink: 1 }]} numberOfLines={1}>
          {hasData
            ? (level === 'Low' ? t('weather.minimalRisk')
              : level === 'Moderate' ? t('weather.monitorConditions')
              : level === 'High' ? t('weather.takePrecautions')
              : level === 'Critical' ? t('weather.immediateAction')
              : t('weather.basedOnACI'))
            : t('weather.noVerifiData')}
        </Text>
        {hasData && onMorePress && (
          <TouchableOpacity onPress={onMorePress} activeOpacity={0.7} style={styles.concreteEvapMoreBtn}>
            <Text style={styles.concreteEvapMoreLink}>{t('common.more')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {!hasData && (
        <Text style={[styles.concreteEvapDesc, { color: WEATHER_COLORS.text.hint, fontSize: ms(8), marginTop: vs(2) }]} numberOfLines={2}>
          {t('weather.requiresVerifi')}
        </Text>
      )}
      {showPlantConfig && (
        <View style={styles.concreteEvapPlantConfig}>
          <Text style={[styles.concreteEvapPlantConfigText, { color: WEATHER_COLORS.text.hint }]} numberOfLines={2}>
            Def. {plantDefaultTemperature != null ? `${plantDefaultTemperature}°F` : t('common.notAvailable')},
            {' '}Concrete {plantConcreteTemperature != null ? `${plantConcreteTemperature}°F` : t('common.notAvailable')},
            {' '}Status: {plantStatusType === 0 ? t('weather.normal') : plantStatusType === 1 ? t('weather.highRisk') : t('common.notAvailable')}
          </Text>
        </View>
      )}
    </View>
  );
};

const CloudsCard: React.FC<{ value: number }> = ({ value }) => {
  const { t } = useTranslation();
  return (
    <WeatherMetricCard
      title={t('weather.cloudCoverage').toUpperCase()}
      titleIcon="cloud-outline"
      description={t('weather.cloudCoverage')}
    >
      <View style={styles.simpleContent}>
        <View style={styles.simpleValueContainer}>
          <Text style={[styles.simpleValue, { color: WEATHER_COLORS.text.primary }]}>
            {value}
          </Text>
          <Text style={[styles.simpleUnit, { color: WEATHER_COLORS.text.primary }]}>
            {t('units.percent')}
          </Text>
        </View>
      </View>
    </WeatherMetricCard>
  );
};

const VisibilityCard: React.FC<{ value: number | null }> = ({ value }) => {
  const { t } = useTranslation();
  const displayValue = value != null ? (value / 1000).toFixed(1) : '--';
  return (
    <WeatherMetricCard
      title={t('weather.visibility').toUpperCase()}
      titleIcon="eye-outline"
      description={value != null ? t('weather.visibilityDistance') : t('common.noData')}
    >
      <View style={styles.simpleContent}>
        <View style={styles.simpleValueContainer}>
          <Text style={[styles.simpleValue, { color: WEATHER_COLORS.text.primary }]}>
            {displayValue}
          </Text>
          <Text style={[styles.simpleUnit, { color: WEATHER_COLORS.text.primary }]}>
            {t('units.kilometers')}
          </Text>
        </View>
      </View>
    </WeatherMetricCard>
  );
};

const ConcreteTemperatureCard: React.FC<{ value: number | null; source?: string | null }> = ({ value, source }) => {
  const { t } = useTranslation();
  return (
    <WeatherMetricCard
      title={t('weather.concreteTemp').toUpperCase()}
      titleIcon="thermometer"
    >
      <View style={styles.simpleContent}>
        <View style={styles.simpleValueContainer}>
          <Text style={[styles.simpleValue, { color: WEATHER_COLORS.text.primary }]}>
            {value != null ? Math.round(value) : '--'}
          </Text>
          <Text style={[styles.simpleUnit, { color: WEATHER_COLORS.text.primary }]}>
            °F
          </Text>
        </View>
      </View>
      {source ? (
        <Text style={styles.concreteTempSource} numberOfLines={1}>
          {source}
        </Text>
      ) : null}
    </WeatherMetricCard>
  );
};

const WindGustCard: React.FC<{ value: number | null }> = ({ value }) => {
  const { t } = useTranslation();
  return (
    <WeatherMetricCard
      title={t('weather.windGust').toUpperCase()}
      titleIcon="weather-windy"
    >
      <View style={styles.simpleContent}>
        <View style={styles.simpleValueContainer}>
          <Text style={[styles.simpleValue, { color: WEATHER_COLORS.text.primary }]}>
            {value != null ? `${value}` : 'N/A'}
          </Text>
          {value != null && (
            <Text style={[styles.simpleUnit, { color: WEATHER_COLORS.text.primary }]}>
              m/s
            </Text>
          )}
        </View>
      </View>
    </WeatherMetricCard>
  );
};

export const WeatherScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<WeatherScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;
  const { alertState, hideAlert, showInfo } = useAlert();

  const { orderCode = '', orderDate = '', orderStatus = 'Pending', startTime = '--:--', ticketCode, freshWeather = null } = route.params ?? {};

  const hasFreshWeather = !!(freshWeather && freshWeather.temperature_fahrenheit != null);

  const [menuVisible, setMenuVisible] = useState(false);
  const [evapInfoVisible, setEvapInfoVisible] = useState(false);
  const [loadingLink, setLoadingLink] = useState<string | null>(null);

  const handlePdfLink = useCallback(async (pdfPath: string, title: string) => {
    setLoadingLink(pdfPath);
    const baseUrl = (axiosInstance.defaults.baseURL || '').replace(/\/api\/?$/, '');
    const pdfUrl = `${baseUrl}${pdfPath}`;

    // Close the BottomSheet first — on iOS, navigation behind a Modal is invisible
    setEvapInfoVisible(false);

    const navigateToWebView = () => {
      navigation.navigate('WebView', { url: pdfUrl, title });
      setLoadingLink(null);
    };

    try {
      if (Platform.OS === 'ios') {
        // iOS: close modal, wait for dismiss animation, then navigate
        // WKWebView renders PDFs natively — no download needed
        setTimeout(navigateToWebView, 350);
      } else {
        // Android: download and open in native PDF viewer
        const filename = pdfPath.split('/').pop() || 'document.pdf';
        const localPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;

        let needsDownload = true;
        const exists = await ReactNativeBlobUtil.fs.exists(localPath);
        if (exists) {
          const stat = await ReactNativeBlobUtil.fs.stat(localPath);
          needsDownload = !stat.size || Number(stat.size) < 1024;
        }

        if (needsDownload) {
          const resp = await ReactNativeBlobUtil.config({ path: localPath }).fetch('GET', pdfUrl);
          const status = resp.info().status;
          if (status < 200 || status >= 300) {
            await ReactNativeBlobUtil.fs.unlink(localPath).catch(() => {});
            throw new Error(`Download failed: ${status}`);
          }
        }

        ReactNativeBlobUtil.android.actionViewIntent(localPath, 'application/pdf');
        setLoadingLink(null);
      }
    } catch {
      // Fallback: open in in-app WebView
      navigateToWebView();
    }
  }, [navigation]);

  // Only fetch from order-level API when fresh weather is NOT available
  const {
    weatherData: apiWeatherData,
    orderInfo,
    isLoading: apiIsLoading,
    isRefetching,
    refetch,
  } = useWeather({
    order_code: hasFreshWeather ? '' : orderCode,
    order_date: hasFreshWeather ? '' : orderDate,
  });

  // Use fresh weather from ticket when available, otherwise fall back to order-level API
  const weatherData = hasFreshWeather ? freshWeather : apiWeatherData;
  const isLoading = hasFreshWeather ? false : apiIsLoading;

  const weather = useMemo(() => {
    if (!weatherData) {
      return null;
    }

    const evapRate = weatherData.evaporation_rate ?? 0;
    const serverLevel = weatherData.evaporation_level;
    let evaporationStatus: 'Low' | 'Moderate' | 'High' = 'Low';
    let evaporationProgress = 15;
    if (serverLevel === 'High' || (!serverLevel && evapRate >= 0.20)) {
      evaporationStatus = 'High';
      evaporationProgress = 85;
    } else if (serverLevel === 'Moderate' || (!serverLevel && evapRate >= 0.10)) {
      evaporationStatus = 'Moderate';
      evaporationProgress = 50;
    }

    const tempF = weatherData.temperature_fahrenheit ?? 0;
    const dewPointF = weatherData.dew_point_fahrenheit ?? 0;

    return {
      location: t('weather.weatherLocation'),
      orderNo: orderCode,
      orderDate: orderDate,
      temperature: tempF,
      temperatureUnit: 'F',
      condition: weatherData.weather_condition ?? t('weather.unknown'),
      iconCode: weatherData.weather_icon,
      maxTemp: weatherData.temperature_max_fahrenheit,
      minTemp: weatherData.temperature_min_fahrenheit,
      evaporation: {
        value: evapRate,
        status: evaporationStatus,
        description: `${weatherData.evaporation_level || evaporationStatus} evaporation rate`,
        progress: evaporationProgress,
      },
      wind: {
        direction: weatherData.wind_direction ?? 'N',
        speed: weatherData.wind_speed_mph ?? 0,
        unit: 'mph',
      },
      pressure: {
        value: weatherData.pressure_inhg ?? 0,
        unit: 'in',
      },
      dewPoint: {
        value: dewPointF,
        description: t('weather.dewPointTemp'),
      },
      humidity: {
        value: weatherData.humidity ?? 0,
        description: dewPointF ? t('weather.dewPointNote', { value: Math.round(dewPointF) }) : '',
      },
      cloudsPercentage: weatherData.clouds_percentage ?? 0,
      visibilityMeters: weatherData.visibility_meters ?? null,
      windGust: weatherData.wind_gust ?? null,
    };
  }, [weatherData, orderCode, orderDate, t]);

  const onRefresh = useCallback(() => {
    if (!hasFreshWeather) {
      refetch();
    }
  }, [refetch, hasFreshWeather]);

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
        concreteTemp: freshWeather?.concrete_temperature_fahrenheit ?? weather.temperature,
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
        title: t('weather.title'),
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  }, [weather]);

  const handleViewForecast = useCallback(() => {
    setMenuVisible(false);
    showInfo(t('weather.sevenDayForecast'), t('weather.forecastComingSoon'));
  }, [showInfo]);

  const handleSettings = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate('Main', { screen: 'Settings' });
  }, [navigation]);

  const menuItems = [
    { id: '1', icon: 'share-variant', label: t('weather.shareWeather'), onPress: handleShare },
    { id: '2', icon: 'calendar-week', label: t('weather.viewForecast'), onPress: handleViewForecast },
    { id: '3', icon: 'cog-outline', label: t('settings.title'), onPress: handleSettings },
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
            <Text style={styles.headerTitle}>{t('weather.title')}</Text>
            <View style={styles.headerActions}>
              <View style={styles.headerActionBtn} />
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer} pointerEvents="box-none">
          <TruckLoader size={120} message={t('weather.loadingWeather')} color="light" />
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
          <Text style={styles.errorText}>{t('weather.unableToLoad')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
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

          <Text style={styles.headerTitle}>{t('weather.title')}</Text>

          <View style={styles.headerActions}>
            {ticketCode ? (
              <View style={styles.ticketBadge}>
                <Icon name="ticket-outline" size={14} color={colors.common.white} />
                <Text style={styles.ticketBadgeText}>{ticketCode}</Text>
              </View>
            ) : (
              <>
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
              </>
            )}
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
              <Text style={styles.orderInfoText}>{t('weather.orderNo', { code: weather.orderNo })}</Text>
              <Text style={styles.orderInfoText}>{t('weather.dateLabel', { date: weather.orderDate })}</Text>
            </View>
          </View>
          <View style={styles.weatherDisplay}>
            <View style={styles.weatherIconContainer}>
              <SharedWeatherIcon icon={weather.iconCode} size={100} />
            </View>

            <View style={styles.temperatureSection}>
              <Text style={styles.temperatureText}>
                {Math.round(weather.temperature ?? 0)}° {weather.temperatureUnit}
              </Text>
              <Text style={styles.conditionText}>{weather.condition}</Text>
              <Text style={styles.minMaxText}>
                {t('weather.maxValue', { value: Math.round(weather.maxTemp ?? 0) + '°' })}  {t('weather.minValue', { value: Math.round(weather.minTemp ?? 0) + '°' })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardsContainer}>
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
                  <ConcreteEvaporationCard
                    rate={freshWeather?.concrete_evaporation_rate}
                    level={freshWeather?.concrete_evaporation_level}
                    tempSource={freshWeather?.concrete_temperature_source}
                    isEstimated={freshWeather?.concrete_temperature_is_estimated}
                    plantDefaultTemperature={freshWeather?.plant_default_temperature}
                    plantConcreteTemperature={freshWeather?.plant_concrete_temperature}
                    plantStatusType={freshWeather?.plant_status_type}
                    onMorePress={() => setEvapInfoVisible(true)}
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
            <View style={styles.cardsRow}>
              <View style={styles.cardWrapper}>
                <View style={styles.cardTouchable}>
                  <CloudsCard value={weather.cloudsPercentage} />
                </View>
              </View>
              <View style={styles.cardWrapper}>
                <View style={styles.cardTouchable}>
                  <VisibilityCard value={weather.visibilityMeters} />
                </View>
              </View>
            </View>
            <View style={styles.cardsRow}>
              <View style={styles.cardWrapper}>
                <View style={styles.cardTouchable}>
                  <WindGustCard value={weather.windGust} />
                </View>
              </View>
              {freshWeather?.concrete_temperature_fahrenheit != null ? (
                <View style={styles.cardWrapper}>
                  <View style={styles.cardTouchable}>
                    <ConcreteTemperatureCard
                      value={freshWeather.concrete_temperature_fahrenheit}
                      source={freshWeather.concrete_temperature_source}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.cardWrapper} />
              )}
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
              <Text style={[styles.menuTitle, { color: WEATHER_COLORS.text.primary }]}>{t('common.menu')}</Text>
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

      <BottomSheet
        visible={evapInfoVisible}
        onClose={() => setEvapInfoVisible(false)}
        title={t('weather.highEvapTitle')}
        headerIcon="alert-circle-outline"
        headerIconColor={colors.evaporationSeverity.high}
        height="auto"
      >
        <View style={styles.evapInfoContent}>
          <Text style={[styles.evapInfoParagraph, { color: themeColors.text.secondary }]}>
            {t('weather.highEvapParagraph')}
          </Text>

          <Text style={[styles.evapInfoSectionTitle, { color: themeColors.text.primary }]}>
            {t('weather.threeEffectsTitle')}
          </Text>

          <View style={styles.evapInfoItem}>
            <Text style={[styles.evapInfoItemTitle, { color: themeColors.text.primary }]}>{t('weather.crazing')}</Text>
            <Text style={[styles.evapInfoItemDesc, { color: themeColors.text.secondary }]}>
              {t('weather.crazingDesc')}
            </Text>
            <TouchableOpacity
              onPress={() => handlePdfLink('/pdfs/nrmca-cip-3-crazing.pdf', 'NRMCA CIP #3: Crazing Concrete Surfaces')}
              activeOpacity={0.7}
              disabled={loadingLink === '/pdfs/nrmca-cip-3-crazing.pdf'}
            >
              <View style={styles.evapInfoReferenceRow}>
                <Text style={styles.evapInfoReference}>{t('weather.crazingRef')}</Text>
                {loadingLink === '/pdfs/nrmca-cip-3-crazing.pdf' && <ActivityIndicator size="small" color={colors.weatherLink.dark} style={styles.linkLoader} />}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.evapInfoItem}>
            <Text style={[styles.evapInfoItemTitle, { color: themeColors.text.primary }]}>{t('weather.plasticShrinkage')}</Text>
            <Text style={[styles.evapInfoItemDesc, { color: themeColors.text.secondary }]}>
              {t('weather.plasticShrinkageDesc')}
            </Text>
            <TouchableOpacity
              onPress={() => handlePdfLink('/pdfs/nrmca-cip-5-plastic-shrinkage.pdf', 'NRMCA CIP #5: Plastic Shrinkage Cracking')}
              activeOpacity={0.7}
              disabled={loadingLink === '/pdfs/nrmca-cip-5-plastic-shrinkage.pdf'}
            >
              <View style={styles.evapInfoReferenceRow}>
                <Text style={styles.evapInfoReference}>{t('weather.plasticShrinkageRef')}</Text>
                {loadingLink === '/pdfs/nrmca-cip-5-plastic-shrinkage.pdf' && <ActivityIndicator size="small" color={colors.weatherLink.dark} style={styles.linkLoader} />}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.evapInfoItem}>
            <Text style={[styles.evapInfoItemTitle, { color: themeColors.text.primary }]}>{t('weather.dryingShrinkage')}</Text>
            <Text style={[styles.evapInfoItemDesc, { color: themeColors.text.secondary }]}>
              {t('weather.dryingShrinkageDesc')}
            </Text>
            <TouchableOpacity
              onPress={() => handlePdfLink('/pdfs/nrmca-cip-4-drying-shrinkage.pdf', 'NRMCA CIP #4: Cracking Concrete Surfaces')}
              activeOpacity={0.7}
              disabled={loadingLink === '/pdfs/nrmca-cip-4-drying-shrinkage.pdf'}
            >
              <View style={styles.evapInfoReferenceRow}>
                <Text style={styles.evapInfoReference}>{t('weather.dryingShrinkageRef')}</Text>
                {loadingLink === '/pdfs/nrmca-cip-4-drying-shrinkage.pdf' && <ActivityIndicator size="small" color={colors.weatherLink.dark} style={styles.linkLoader} />}
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.evapInfoRecommendedSection, { borderTopColor: themeColors.border }]}>
            <Text style={[styles.evapInfoRecommendedTitle, { color: colors.evaporationSeverity.critical }]}>
              {t('weather.recommendedTitle')}
            </Text>
            <Text style={[styles.evapInfoItemDesc, { color: themeColors.text.secondary, marginBottom: vs(8) }]}>
              {t('weather.recommendedIntro')}
            </Text>
            {[
              t('weather.practice1'),
              t('weather.practice2'),
              t('weather.practice3'),
              t('weather.practice4'),
              t('weather.practice5'),
              t('weather.practice6'),
              t('weather.practice7'),
              t('weather.practice8'),
            ].map((item, index) => (
              <View key={index} style={styles.evapInfoBulletRow}>
                <Text style={[styles.evapInfoBullet, { color: themeColors.text.secondary }]}>{'\u2022'}</Text>
                <Text style={[styles.evapInfoBulletText, { color: themeColors.text.secondary }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </BottomSheet>
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
    alignItems: 'center',
    gap: GRID.sm,
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    backgroundColor: colors.common.white + '20',
    paddingHorizontal: ms(10),
    paddingVertical: ms(5),
    borderRadius: ms(12),
  },
  ticketBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    color: colors.common.white,
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
    width: ms(125),
    height: ms(125),
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
    height: responsive(ms(170), ms(210)),
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
    height: responsive(ms(170), ms(210)),
    borderWidth: 1,
    overflow: 'hidden',
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    minHeight: ms(20),
  },
  metricCardIconWrap: {
    width: ms(18),
    height: ms(18),
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: fontFamily.medium,
    fontSize: responsive(ms(28), ms(34)),
    lineHeight: responsive(ms(34), ms(40)),
  },
  metricCardUnit: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(14), ms(17)),
    marginTop: ms(3),
    marginLeft: ms(2),
  },
  metricCardDescription: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(11), ms(14)),
    lineHeight: responsive(ms(15), ms(18)),
    marginTop: ms(8),
  },
  concreteEvapValue: {
    fontSize: responsive(ms(28), ms(34)),
    fontFamily: fontFamily.medium,
    lineHeight: responsive(ms(34), ms(40)),
    textAlign: 'center',
    marginTop: responsive(ms(2), ms(6)),
  },
  concreteEvapLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(5),
    marginBottom: responsive(ms(4), ms(8)),
  },
  concreteEvapDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  concreteEvapLevelText: {
    fontFamily: fontFamily.medium,
    fontSize: responsive(ms(11), ms(14)),
  },
  concreteEvapUnitText: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(9), ms(11)),
  },
  concreteEvapBarTrack: {
    height: responsive(ms(6), ms(8)),
    borderRadius: responsive(ms(3), ms(4)),
    backgroundColor: colors.semiTransparent.white12,
    overflow: 'hidden',
    marginBottom: responsive(ms(4), ms(6)),
  },
  concreteEvapBarFill: {
    height: '100%',
    borderRadius: responsive(ms(3), ms(4)),
  },
  concreteEvapDesc: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(10), ms(13)),
    lineHeight: responsive(ms(13), ms(17)),
  },
  concreteEvapPlantConfig: {
    marginTop: vs(4),
    paddingTop: vs(4),
    borderTopWidth: 1,
    borderTopColor: colors.semiTransparent.white12,
  },
  concreteEvapPlantConfigText: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(8), ms(10)),
    lineHeight: responsive(ms(11), ms(14)),
  },
  concreteEvapDescRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  concreteEvapMoreBtn: {
    flexShrink: 0,
    paddingLeft: ms(4),
  },
  concreteEvapMoreLink: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(10), ms(13)),
    color: colors.weatherLink.dark,
  },
  evapInfoContent: {
    gap: vs(12),
  },
  evapInfoParagraph: {
    fontFamily: fontFamily.regular,
    fontSize: ms(13),
    lineHeight: ms(19),
  },
  evapInfoSectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    lineHeight: ms(20),
  },
  evapInfoItem: {
    gap: vs(2),
    paddingLeft: ms(12),
  },
  evapInfoItemTitle: {
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
    lineHeight: ms(19),
  },
  evapInfoItemDesc: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    lineHeight: ms(17),
  },
  evapInfoReference: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    lineHeight: ms(15),
    color: colors.weatherLink.dark,
    flex: 1,
  },
  evapInfoReferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkLoader: {
    marginLeft: ms(6),
  },
  concreteTempSource: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    color: colors.evaporationSeverity.low,
    marginTop: vs(2),
  },
  evapInfoRecommendedSection: {
    marginTop: vs(4),
    paddingTop: vs(12),
    borderTopWidth: 1,
  },
  evapInfoRecommendedTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    lineHeight: ms(20),
    marginBottom: vs(4),
  },
  evapInfoBulletRow: {
    flexDirection: 'row',
    paddingLeft: ms(12),
    marginBottom: vs(4),
  },
  evapInfoBullet: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    lineHeight: ms(17),
    marginRight: ms(8),
  },
  evapInfoBulletText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    lineHeight: ms(17),
    flex: 1,
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
    fontFamily: fontFamily.medium,
    fontSize: responsive(ms(28), ms(34)),
    lineHeight: responsive(ms(34), ms(40)),
  },
  simpleUnit: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(14), ms(17)),
    marginTop: ms(3),
    marginLeft: ms(2),
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
