import React, { useCallback, useState } from 'react';
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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import Svg, { Circle, Path, Line, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Text, EvaporationProgress } from '../../components/common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs, responsive, wp, hp, isTablet } from '../../utils/responsive';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

const mockWeatherData = {
  location: 'Charlotte',
  orderNo: '553439',
  orderDate: '12-9-2025',
  temperature: 28,
  temperatureUnit: 'F',
  condition: 'Precipitations',
  maxTemp: 31,
  minTemp: 25,
  evaporation: { value: 0.15, status: 'Low' as const, description: 'Low for the rest of the day.', progress: 15 },
  concreteTemp: { value: 55, description: `Similar to\nthe actual\ntemperature` },
  wind: { direction: 'NW', speed: 12, unit: 'mph' },
  pressure: { value: 30.15, unit: 'in' },
  dewPoint: { value: 45, description: 'Similar to the actual temperature' },
  humidity: { value: 73, description: 'The dew point is 16° right now.' },
  productRecommendations: [
    { id: '1', label: 'Termal Cracking', color: colors.productChip.thermalCracking },
    { id: '2', label: 'Plastic Cracking', color: colors.productChip.plasticCracking },
  ],
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
<<<<<<< Updated upstream
  const svgWidth = responsive(ms(120), ms(150));
  const svgHeight = responsive(ms(75), ms(95));
  const radius = responsive(ms(48), ms(60));
  const strokeWidth = responsive(ms(3), ms(4));
=======
  const { t } = useTranslation();
  const svgWidth = responsive(ms(130), ms(160));
  const svgHeight = responsive(ms(95), ms(115));
  const radius = responsive(ms(45), ms(55));
  const strokeWidth = responsive(ms(4), ms(5));
>>>>>>> Stashed changes
  const centerX = svgWidth / 2;
  const centerY = responsive(ms(5), ms(8));

  // Pressure typically ranges from 29.5 to 30.5 inches
  const minPressure = 29.5;
  const maxPressure = 30.5;
  const normalizedValue = (value - minPressure) / (maxPressure - minPressure);
  const clampedValue = Math.max(0, Math.min(1, normalizedValue));

  // Arc from upper-left to upper-right, curving DOWN
  const startAngle = 210;
  const endAngle = 330;
  const arcSpan = endAngle - startAngle;
  const progressAngle = startAngle + (clampedValue * arcSpan);

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Arc endpoints
  const startX = centerX + Math.cos(toRad(startAngle)) * radius;
  const startY = centerY + Math.sin(toRad(startAngle)) * radius;
  const endX = centerX + Math.cos(toRad(endAngle)) * radius;
  const endY = centerY + Math.sin(toRad(endAngle)) * radius;

  // Progress indicator position
  const progressX = centerX + Math.cos(toRad(progressAngle)) * radius;
  const progressY = centerY + Math.sin(toRad(progressAngle)) * radius;

  return (
    <WeatherMetricCard title={t('weather.metrics.pressure')} titleIcon="arrow-up-down">
      <View style={styles.pressureContent}>
        <Svg width={svgWidth} height={svgHeight}>
          {/* Background arc (gray track) */}
          <Path
            d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
            stroke={WEATHER_COLORS.text.hint + '40'}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />

          {/* Progress arc (white) - from start to current position */}
          {clampedValue > 0 && (
            <Path
              d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${progressX} ${progressY}`}
              stroke={colors.common.white}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* Indicator dot at progress position */}
          <Circle
            cx={progressX}
            cy={progressY}
            r={responsive(ms(5), ms(6))}
            fill="#FF6B6B"
          />

          {/* Value text centered below arc */}
          <SvgText
            x={centerX}
            y={centerY + radius - responsive(ms(5), ms(8))}
            fontSize={responsive(ms(22), ms(28))}
            fontWeight="600"
            fill={WEATHER_COLORS.text.primary}
            textAnchor="middle"
          >
            {value}
          </SvgText>

          {/* Unit text below value */}
          <SvgText
            x={centerX}
            y={centerY + radius + responsive(ms(12), ms(16))}
            fontSize={responsive(ms(14), ms(18))}
            fill={WEATHER_COLORS.text.primary}
            textAnchor="middle"
          >
            {unit}
          </SvgText>
        </Svg>
      </View>
    </WeatherMetricCard>
  );
};

// ============================================
// Reusable Weather Metric Card Component
// ============================================
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
      {/* Header Row - Icon + Title (top-left) */}
      <View style={styles.metricCardHeader}>
        <Icon name={titleIcon} size={ms(14)} color={WEATHER_COLORS.text.hint} />
        <Text style={[styles.metricCardTitle, { color: WEATHER_COLORS.text.hint }]}>
          {title}
        </Text>
      </View>

      {/* Custom Content or Value Display (centered) */}
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

      {/* Optional Description (bottom) */}
      {description && (
        <Text style={[styles.metricCardDescription, { color: WEATHER_COLORS.text.secondary }]} numberOfLines={2}>
          {description}
        </Text>
      )}
    </View>
  );
};

// ============================================
// Concrete Temperature Card
// ============================================
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
            {value}
          </Text>
          <Text style={[styles.concreteUnit, { color: WEATHER_COLORS.text.primary }]}>
            °
          </Text>
        </View>
      </View>
    </WeatherMetricCard>
  );
};

// ============================================
// Wind Card with Compass
// ============================================
interface WindCardProps {
  direction: string;
  speed: number;
  unit: string;
}

const WindCard: React.FC<WindCardProps> = ({ direction, speed, unit }) => {
  const { t } = useTranslation();
  const size = responsive(ms(60), ms(80));
  const center = size / 2;
  const radius = size / 2 - responsive(8, 10);

  // Direction to angle mapping
  const directionAngles: Record<string, number> = {
    'N': 0, 'NE': 45, 'E': 90, 'SE': 135,
    'S': 180, 'SW': 225, 'W': 270, 'NW': 315,
  };
  const angle = directionAngles[direction] || 0;

  // Calculate needle end point
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
    <WeatherMetricCard title={t('weather.metrics.wind')} titleIcon="weather-windy">
      <View style={styles.windContent}>
        <Svg width={size} height={size}>
          {/* Outer circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={WEATHER_COLORS.text.hint + '40'}
            strokeWidth="1.5"
            fill="transparent"
          />

          {/* Inner decorative circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius - 10}
            stroke={WEATHER_COLORS.text.hint + '30'}
            strokeWidth="1"
            fill="transparent"
            strokeDasharray="2 2"
          />

          {/* Direction labels */}
          {directions.map((dir, i) => (
            <SvgText
              key={dir}
              x={directionPositions[i].x}
              y={directionPositions[i].y}
              fontSize={ms(8)}
              fontWeight={dir === 'N' ? 'bold' : 'normal'}
              fill={dir === 'N' ? colors.error.light : WEATHER_COLORS.text.hint}
              textAnchor="middle"
            >
              {dir}
            </SvgText>
          ))}

          {/* Wind direction needle */}
          <Line
            x1={center}
            y1={center}
            x2={needleX}
            y2={needleY}
            stroke={colors.common.white}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Center dot */}
          <Circle cx={center} cy={center} r="3" fill={colors.common.white} />
        </Svg>

        {/* Wind Speed Display */}
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

// ============================================
// Dew Point Card
// ============================================
interface DewPointCardProps {
  value: number;
  description: string;
}

const DewPointCard: React.FC<DewPointCardProps> = ({ value, description }) => {
  const { t } = useTranslation();
  return (
    <WeatherMetricCard
      title={t('weather.metrics.dewPoint')}
      titleIcon="thermometer-low"
      description={description}
    >
      <View style={styles.simpleContent}>
        <View style={styles.simpleValueContainer}>
          <Text style={[styles.simpleValue, { color: WEATHER_COLORS.text.primary }]}>
            {value}
          </Text>
          <Text style={[styles.simpleUnit, { color: WEATHER_COLORS.text.primary }]}>
            °
          </Text>
        </View>
      </View>
    </WeatherMetricCard>
  );
};

// ============================================
// Humidity Card with Arc Gauge
// ============================================
interface HumidityCardProps {
  value: number;
  description: string;
}

const HumidityCard: React.FC<HumidityCardProps> = ({ value, description }) => {
  const { t } = useTranslation();
  return (
    <WeatherMetricCard
      title={t('weather.metrics.humidity')}
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
  onPress?: () => void;
}

const RecommendationChip: React.FC<RecommendationChipProps> = ({ label, color, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.recommendationChip, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={styles.recommendationChipText}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
<<<<<<< Updated upstream
    </TouchableOpacity>
=======
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
  Low: '#22C55E',
  Moderate: '#F59E0B',
  High: '#F97316',
  Critical: '#DC2626',
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
          {t('weather.metrics.concreteEvap')}
        </Text>
      </View>

      <Text style={[styles.concreteEvapValue, { color: WEATHER_COLORS.text.primary }]}>
        {hasData ? rate.toFixed(4) : 'N/A'}
      </Text>

      {hasData ? (
        <View style={styles.concreteEvapLevelBadge}>
          <View style={[styles.concreteEvapDot, { backgroundColor: levelColor }]} />
          <Text style={[styles.concreteEvapLevelText, { color: levelColor }]}>
            {level}
          </Text>
          <Text style={[styles.concreteEvapUnitText, { color: WEATHER_COLORS.text.secondary }]}>
            kg/m²/hr
          </Text>
        </View>
      ) : null}

      <View style={styles.concreteEvapBarTrack}>
        <View style={[styles.concreteEvapBarFill, { width: `${progress}%`, backgroundColor: levelColor }]} />
      </View>

      <View style={styles.concreteEvapDescRow}>
        <Text style={[styles.concreteEvapDesc, { color: WEATHER_COLORS.text.secondary }]} numberOfLines={1}>
          {hasData
            ? (level === 'Low' ? t('weather.evapLevel.minimalRisk')
              : level === 'Moderate' ? t('weather.evapLevel.monitorConditions')
              : level === 'High' ? t('weather.evapLevel.takePrecautions')
              : level === 'Critical' ? t('weather.evapLevel.immediateAction')
              : t('weather.evapLevel.aci305Formula'))
            : t('weather.noVerifiData')}
        </Text>
        {hasData && onMorePress && (
          <TouchableOpacity onPress={onMorePress} activeOpacity={0.7}>
            <Text style={styles.concreteEvapMoreLink}>{t('weather.more')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {!hasData && (
        <Text style={[styles.concreteEvapDesc, { color: WEATHER_COLORS.text.hint, fontSize: ms(8), marginTop: vs(2) }]} numberOfLines={2}>
          {t('weather.requiresConcreteDischarge')}
        </Text>
      )}
      {showPlantConfig && (
        <View style={styles.concreteEvapPlantConfig}>
          <Text style={[styles.concreteEvapPlantConfigText, { color: WEATHER_COLORS.text.hint }]} numberOfLines={2}>
            {t('weather.plantConfigSummary', {
              def: plantDefaultTemperature != null ? `${plantDefaultTemperature}°F` : 'N/A',
              concrete: plantConcreteTemperature != null ? `${plantConcreteTemperature}°F` : 'N/A',
              status: plantStatusType === 0 ? t('weather.plantStatus.normal') : plantStatusType === 1 ? t('weather.plantStatus.highRisk') : 'N/A',
            })}
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
      title={t('weather.metrics.cloudCover')}
      titleIcon="cloud-outline"
      description={t('weather.cloudCoverage')}
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

const VisibilityCard: React.FC<{ value: number | null }> = ({ value }) => {
  const { t } = useTranslation();
  const displayValue = value != null ? (value / 1000).toFixed(1) : '--';
  return (
    <WeatherMetricCard
      title={t('weather.metrics.visibility')}
      titleIcon="eye-outline"
      description={value != null ? t('weather.visibilityDistance') : t('common.noData')}
    >
      <View style={styles.simpleContent}>
        <View style={styles.simpleValueContainer}>
          <Text style={[styles.simpleValue, { color: WEATHER_COLORS.text.primary }]}>
            {displayValue}
          </Text>
          <Text style={[styles.simpleUnit, { color: WEATHER_COLORS.text.primary }]}>
            km
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
      title={t('weather.metrics.concreteTemp')}
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
      title={t('weather.metrics.windGust')}
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
>>>>>>> Stashed changes
  );
};

// ============================================
// Main Screen Component
// ============================================
export const WeatherScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
<<<<<<< Updated upstream
=======
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const { alertState, hideAlert, showInfo } = useAlert();
  const { t } = useTranslation();

  const { orderCode = '', orderDate = '', orderStatus = 'Pending', startTime = '--:--', ticketCode, freshWeather = null } = route.params ?? {};

  const hasFreshWeather = !!(freshWeather && freshWeather.temperature_fahrenheit != null);
>>>>>>> Stashed changes

  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
<<<<<<< Updated upstream
  const weather = mockWeatherData;
=======
  const [evapInfoVisible, setEvapInfoVisible] = useState(false);
  const [loadingLink, setLoadingLink] = useState<string | null>(null);

  const handlePdfLink = useCallback(async (pdfPath: string, title: string) => {
    setLoadingLink(pdfPath);
    try {
      const filename = pdfPath.split('/').pop() || 'document.pdf';
      const localPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;

      // Check if already downloaded
      const exists = await ReactNativeBlobUtil.fs.exists(localPath);
      if (!exists) {
        const baseUrl = (axiosInstance.defaults.baseURL || '').replace(/\/api\/?$/, '');
        const pdfUrl = `${baseUrl}${pdfPath}`;
        await ReactNativeBlobUtil.config({ path: localPath }).fetch('GET', pdfUrl);
      }

      if (Platform.OS === 'ios') {
        ReactNativeBlobUtil.ios.openDocument(localPath);
      } else {
        ReactNativeBlobUtil.android.actionViewIntent(localPath, 'application/pdf');
      }
    } catch {
      // Fallback: open in WebView
      const baseUrl = (axiosInstance.defaults.baseURL || '').replace(/\/api\/?$/, '');
      navigation.navigate('WebView', { url: `${baseUrl}${pdfPath}`, title });
    } finally {
      setLoadingLink(null);
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
      location: i18n.t('weather.weatherLocation'),
      orderNo: orderCode,
      orderDate: orderDate,
      temperature: tempF,
      temperatureUnit: 'F',
      condition: weatherData.weather_condition ?? i18n.t('weather.unknown'),
      iconCode: weatherData.weather_icon,
      maxTemp: weatherData.temperature_max_fahrenheit,
      minTemp: weatherData.temperature_min_fahrenheit,
      evaporation: {
        value: evapRate,
        status: evaporationStatus,
        description: i18n.t('weather.evaporationRateDescription', { level: weatherData.evaporation_level || evaporationStatus }),
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
        description: i18n.t('weather.dewPointTemperature'),
      },
      humidity: {
        value: weatherData.humidity ?? 0,
        description: dewPointF ? i18n.t('weather.dewPointNote', { value: Math.round(dewPointF) }) : '',
      },
      cloudsPercentage: weatherData.clouds_percentage ?? 0,
      visibilityMeters: weatherData.visibility_meters ?? null,
      windGust: weatherData.wind_gust ?? null,
    };
  }, [weatherData, orderCode, orderDate]);
>>>>>>> Stashed changes

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleProductDetailsPress = useCallback(() => {
    navigation.navigate('ProductDetails', {
      productId: '1',
      productName: 'Product Recommendations',
      weatherData: {
        temperature: weather.temperature,
        temperatureUnit: weather.temperatureUnit,
        condition: weather.condition,
        icon: 'weather-partly-cloudy',
        humidity: weather.humidity.value,
        windSpeed: weather.wind.speed,
        location: weather.location,
      },
    });
  }, [navigation, weather]);

  const handleEvaporationPress = useCallback(() => {
    navigation.navigate('EvaporationList', {
      locationName: weather.location,
      date: weather.orderDate,
      currentEvaporation: {
        value: weather.evaporation.value,
        status: weather.evaporation.status,
        description: weather.evaporation.description,
      },
    });
  }, [navigation, weather]);

  const handleConcretePress = useCallback(() => {
    navigation.navigate('ProductCode', {
      cardType: 'concrete',
      cardValue: weather.concreteTemp.value,
      cardUnit: '°',
      weatherData: {
        temperature: weather.temperature,
        temperatureUnit: weather.temperatureUnit,
        condition: weather.condition,
        icon: 'weather-partly-cloudy',
        humidity: weather.humidity.value,
        windSpeed: weather.wind.speed,
        location: weather.location,
      },
    });
  }, [navigation, weather]);

  const handleWindPress = useCallback(() => {
    navigation.navigate('ProductCode', {
      cardType: 'wind',
      cardValue: weather.wind.speed,
      cardUnit: weather.wind.unit,
      weatherData: {
        temperature: weather.temperature,
        temperatureUnit: weather.temperatureUnit,
        condition: weather.condition,
        icon: 'weather-partly-cloudy',
        humidity: weather.humidity.value,
        windSpeed: weather.wind.speed,
        location: weather.location,
      },
    });
  }, [navigation, weather]);

  const handlePressurePress = useCallback(() => {
    navigation.navigate('ProductCode', {
      cardType: 'pressure',
      cardValue: weather.pressure.value,
      cardUnit: weather.pressure.unit,
      weatherData: {
        temperature: weather.temperature,
        temperatureUnit: weather.temperatureUnit,
        condition: weather.condition,
        icon: 'weather-partly-cloudy',
        humidity: weather.humidity.value,
        windSpeed: weather.wind.speed,
        location: weather.location,
      },
    });
  }, [navigation, weather]);

  const handleDewPointPress = useCallback(() => {
    navigation.navigate('ProductCode', {
      cardType: 'dewpoint',
      cardValue: weather.dewPoint.value,
      cardUnit: '°',
      weatherData: {
        temperature: weather.temperature,
        temperatureUnit: weather.temperatureUnit,
        condition: weather.condition,
        icon: 'weather-partly-cloudy',
        humidity: weather.humidity.value,
        windSpeed: weather.wind.speed,
        location: weather.location,
      },
    });
  }, [navigation, weather]);

  const handleHumidityPress = useCallback(() => {
    navigation.navigate('ProductCode', {
      cardType: 'humidity',
      cardValue: weather.humidity.value,
      cardUnit: '%',
      weatherData: {
        temperature: weather.temperature,
        temperatureUnit: weather.temperatureUnit,
        condition: weather.condition,
        icon: 'weather-partly-cloudy',
        humidity: weather.humidity.value,
        windSpeed: weather.wind.speed,
        location: weather.location,
      },
    });
  }, [navigation, weather]);

  const handleMenuToggle = useCallback(() => {
    setMenuVisible(prev => !prev);
  }, []);

  const handleShare = useCallback(async () => {
    setMenuVisible(false);
    try {
      await Share.share({
        message: t('weather.shareMessage', {
          location: weather.location,
          temperature: weather.temperature,
          temperatureUnit: weather.temperatureUnit,
          condition: weather.condition,
          max: weather.maxTemp,
          min: weather.minTemp,
        }),
        title: t('weather.title'),
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  }, [weather]);

  const handleViewForecast = useCallback(() => {
    setMenuVisible(false);
<<<<<<< Updated upstream
    Alert.alert('7-Day Forecast', 'Extended forecast feature coming soon!');
  }, []);
=======
    showInfo(t('weather.sevenDayForecast'), t('weather.forecastComingSoon'));
  }, [showInfo, t]);
>>>>>>> Stashed changes

  const handleSettings = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate('Main', { screen: 'Settings' });
  }, [navigation]);

  const menuItems = [
    { id: '1', icon: 'share-variant', label: t('weather.shareWeather'), onPress: handleShare },
    { id: '2', icon: 'calendar-week', label: t('weather.viewForecast'), onPress: handleViewForecast },
    { id: '3', icon: 'cog-outline', label: t('settings.title'), onPress: handleSettings },
  ];

<<<<<<< Updated upstream
=======
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

>>>>>>> Stashed changes
  return (
    <View style={[styles.container, { backgroundColor: WEATHER_COLORS.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={WEATHER_COLORS.background} />

      <LinearGradient
        colors={WEATHER_COLORS.gradient.colors}
        locations={WEATHER_COLORS.gradient.locations}
        style={styles.gradientBackground}
      />

<<<<<<< Updated upstream
=======

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


>>>>>>> Stashed changes
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.common.white}
            colors={[colors.common.white]}
            progressViewOffset={insets.top}
          />
        }>
        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
              <Icon name="chevron-left" size={24} color={colors.common.white} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Weather Update</Text>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerActionBtn} onPress={onRefresh} activeOpacity={0.7}>
                <Icon name="refresh" size={20} color={colors.common.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionBtn} onPress={handleMenuToggle} activeOpacity={0.7}>
                <Icon name="menu" size={20} color={colors.common.white} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.locationOrderRow}>
            <View style={styles.locationContainer}>
              <Icon name="map-marker" size={16} color={colors.common.white} />
              <Text style={styles.locationText}>{weather.location}</Text>
            </View>

            <View style={styles.orderInfoContainer}>
              <Text style={styles.orderInfoText}>{t('weather.orderNoLabel', { value: weather.orderNo })}</Text>
              <Text style={styles.orderInfoText}>{t('weather.dateLabel', { value: weather.orderDate })}</Text>
            </View>
          </View>
          <View style={styles.weatherDisplay}>
            <WeatherIcon size={ms(100)} />

            <View style={styles.temperatureSection}>
              <Text style={styles.temperatureText}>
                {weather.temperature}° {weather.temperatureUnit}
              </Text>
              <Text style={styles.conditionText}>{weather.condition}</Text>
              <Text style={styles.minMaxText}>
<<<<<<< Updated upstream
                Max: {weather.maxTemp}°  Min: {weather.minTemp}°
=======
                {t('weather.maxMin', { max: Math.round(weather.maxTemp ?? 0), min: Math.round(weather.minTemp ?? 0) })}
>>>>>>> Stashed changes
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
              <View style={styles.recommendationsChipsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recommendationsScroll}>
                  {weather.productRecommendations.map((item) => (
                    <RecommendationChip
                      key={item.id}
                      label={item.label}
                      color={item.color}
                    />
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={styles.recommendationsArrow}
                activeOpacity={0.7}
                onPress={handleProductDetailsPress}>
                <Icon name="chevron-right" size={ms(24)} color={WEATHER_COLORS.background} />
              </TouchableOpacity>
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
                <TouchableOpacity
                  style={styles.cardTouchable}
                  onPress={handleConcretePress}
                  activeOpacity={0.8}>
                  <ConcreteTempCard
                    value={weather.concreteTemp.value}
                    description={weather.concreteTemp.description}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.cardsRow}>
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  style={styles.cardTouchable}
                  onPress={handleWindPress}
                  activeOpacity={0.8}>
                  <WindCard
                    direction={weather.wind.direction}
                    speed={weather.wind.speed}
                    unit={weather.wind.unit}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  style={styles.cardTouchable}
                  onPress={handlePressurePress}
                  activeOpacity={0.8}>
                  <PressureCard
                    value={weather.pressure.value}
                    unit={weather.pressure.unit}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.cardsRow}>
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  style={styles.cardTouchable}
                  onPress={handleDewPointPress}
                  activeOpacity={0.8}>
                  <DewPointCard
                    value={weather.dewPoint.value}
                    description={weather.dewPoint.description}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  style={styles.cardTouchable}
                  onPress={handleHumidityPress}
                  activeOpacity={0.8}>
                  <HumidityCard
                    value={weather.humidity.value}
                    description={weather.humidity.description}
                  />
                </TouchableOpacity>
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
              <Text style={[styles.menuTitle, { color: WEATHER_COLORS.text.primary }]}>{t('weather.menu')}</Text>
              <TouchableOpacity
                style={styles.menuCloseBtn}
                onPress={handleMenuToggle}
                activeOpacity={0.7}
              >
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
<<<<<<< Updated upstream
=======

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
        title={t('weather.evapInfo.title')}
        headerIcon="alert-circle-outline"
        headerIconColor="#F97316"
        height="auto"
      >
        <View style={styles.evapInfoContent}>
          <Text style={[styles.evapInfoParagraph, { color: themeColors.text.secondary }]}>
            {t('weather.evapInfo.intro')}
          </Text>

          <Text style={[styles.evapInfoSectionTitle, { color: themeColors.text.primary }]}>
            {t('weather.evapInfo.commonEffectsTitle')}
          </Text>

          <View style={styles.evapInfoItem}>
            <Text style={[styles.evapInfoItemTitle, { color: themeColors.text.primary }]}>{t('weather.evapInfo.crazing.title')}</Text>
            <Text style={[styles.evapInfoItemDesc, { color: themeColors.text.secondary }]}>
              {t('weather.evapInfo.crazing.description')}
            </Text>
            <TouchableOpacity
              onPress={() => handlePdfLink('/pdfs/nrmca-cip-3-crazing.pdf', t('weather.evapInfo.crazing.pdfTitle'))}
              activeOpacity={0.7}
              disabled={loadingLink === '/pdfs/nrmca-cip-3-crazing.pdf'}
            >
              <View style={styles.evapInfoReferenceRow}>
                <Text style={styles.evapInfoReference}>{t('weather.evapInfo.crazing.reference')}</Text>
                {loadingLink === '/pdfs/nrmca-cip-3-crazing.pdf' && <ActivityIndicator size="small" color="#60A5FA" style={styles.linkLoader} />}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.evapInfoItem}>
            <Text style={[styles.evapInfoItemTitle, { color: themeColors.text.primary }]}>{t('weather.evapInfo.plasticShrinkage.title')}</Text>
            <Text style={[styles.evapInfoItemDesc, { color: themeColors.text.secondary }]}>
              {t('weather.evapInfo.plasticShrinkage.description')}
            </Text>
            <TouchableOpacity
              onPress={() => handlePdfLink('/pdfs/nrmca-cip-5-plastic-shrinkage.pdf', t('weather.evapInfo.plasticShrinkage.pdfTitle'))}
              activeOpacity={0.7}
              disabled={loadingLink === '/pdfs/nrmca-cip-5-plastic-shrinkage.pdf'}
            >
              <View style={styles.evapInfoReferenceRow}>
                <Text style={styles.evapInfoReference}>{t('weather.evapInfo.plasticShrinkage.reference')}</Text>
                {loadingLink === '/pdfs/nrmca-cip-5-plastic-shrinkage.pdf' && <ActivityIndicator size="small" color="#60A5FA" style={styles.linkLoader} />}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.evapInfoItem}>
            <Text style={[styles.evapInfoItemTitle, { color: themeColors.text.primary }]}>{t('weather.evapInfo.dryingShrinkage.title')}</Text>
            <Text style={[styles.evapInfoItemDesc, { color: themeColors.text.secondary }]}>
              {t('weather.evapInfo.dryingShrinkage.description')}
            </Text>
            <TouchableOpacity
              onPress={() => handlePdfLink('/pdfs/nrmca-cip-4-drying-shrinkage.pdf', t('weather.evapInfo.dryingShrinkage.pdfTitle'))}
              activeOpacity={0.7}
              disabled={loadingLink === '/pdfs/nrmca-cip-4-drying-shrinkage.pdf'}
            >
              <View style={styles.evapInfoReferenceRow}>
                <Text style={styles.evapInfoReference}>{t('weather.evapInfo.dryingShrinkage.reference')}</Text>
                {loadingLink === '/pdfs/nrmca-cip-4-drying-shrinkage.pdf' && <ActivityIndicator size="small" color="#60A5FA" style={styles.linkLoader} />}
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.evapInfoRecommendedSection, { borderTopColor: themeColors.border }]}>
            <Text style={[styles.evapInfoRecommendedTitle, { color: '#DC2626' }]}>
              {t('weather.evapInfo.recommendedTitle')}
            </Text>
            <Text style={[styles.evapInfoItemDesc, { color: themeColors.text.secondary, marginBottom: vs(8) }]}>
              {t('weather.evapInfo.recommendedIntro')}
            </Text>
            {[
              t('weather.evapInfo.tips.0'),
              t('weather.evapInfo.tips.1'),
              t('weather.evapInfo.tips.2'),
              t('weather.evapInfo.tips.3'),
              t('weather.evapInfo.tips.4'),
              t('weather.evapInfo.tips.5'),
              t('weather.evapInfo.tips.6'),
              t('weather.evapInfo.tips.7'),
            ].map((item, index) => (
              <View key={index} style={styles.evapInfoBulletRow}>
                <Text style={[styles.evapInfoBullet, { color: themeColors.text.secondary }]}>{'\u2022'}</Text>
                <Text style={[styles.evapInfoBulletText, { color: themeColors.text.secondary }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </BottomSheet>
>>>>>>> Stashed changes
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
  headerContent: {
    paddingHorizontal: GRID.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: GRID.md,
    paddingTop: GRID.sm,
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
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.xs,
  },
  locationText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
    color: colors.common.white,
  },
  orderInfoContainer: {
    alignItems: 'flex-end',
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
    alignItems: 'center', // Vertically center all children
    minHeight: ms(40), // Minimum height for consistent layout
  },
  recommendationsChipsContainer: {
    flex: 1, // Take available space, push arrow to right
    flexShrink: 1,
  },
  recommendationsScroll: {
    flexDirection: 'row',
    alignItems: 'center', // Center chips vertically within scroll
    gap: GRID.sm,
    paddingVertical: ms(2), // Small vertical padding for touch area
  },
  recommendationsArrow: {
    width: ms(36),
    height: ms(36),
    borderRadius: RADIUS.full,
    backgroundColor: colors.productChip.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: GRID.sm,
    flexShrink: 0, // Prevent arrow from shrinking
  },
  recommendationChip: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: RADIUS.full,
    minWidth: ms(80),
    maxWidth: ms(140),
    justifyContent: 'center', // Center text vertically within chip
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
  // ============================================
  // Reusable Metric Card Styles
  // ============================================
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

  // ============================================
  // Concrete Card Styles
  // ============================================
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

  // ============================================
  // Wind Card Styles
  // ============================================
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

  // ============================================
  // Pressure Card Styles
  // ============================================
  pressureContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ============================================
  // Dew Point Card Styles
  // ============================================
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

  // ============================================
  // Humidity Card Styles
  // ============================================
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
});

export default WeatherScreen;
