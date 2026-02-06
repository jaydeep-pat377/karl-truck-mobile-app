
import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path, Line, Text as SvgText } from 'react-native-svg';
import { Text, Icon } from '../../components/common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs, responsive } from '../../utils/responsive';
import { RootStackParamList, WeatherCardType } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ProductDetailsRouteProp = RouteProp<RootStackParamList, 'ProductDetails'>;

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

const THEME_COLORS = colors.weatherTheme;

const cardConfig: Record<WeatherCardType, {
  title: string;
  icon: string;
  color: string;
  infoTitle: string;
  infoItems: { label: string; description: string }[];
}> = {
  concrete: {
    title: 'Concrete Temperature',
    icon: 'cube-outline',
    color: colors.weatherParams.temperature,
    infoTitle: 'About Concrete Temperature',
    infoItems: [
      { label: 'Optimal Range', description: '50°F - 90°F (10°C - 32°C) for best curing results' },
      { label: 'Cold Weather', description: 'Below 40°F may require heating or insulation' },
      { label: 'Hot Weather', description: 'Above 90°F requires special precautions' },
      { label: 'Curing Impact', description: 'Temperature affects hydration rate and final strength' },
    ],
  },
  wind: {
    title: 'Wind Conditions',
    icon: 'weather-windy',
    color: colors.weatherParams.wind,
    infoTitle: 'About Wind Speed',
    infoItems: [
      { label: 'Light Breeze', description: '0-10 mph - Ideal for concrete work' },
      { label: 'Moderate Wind', description: '10-20 mph - May increase evaporation' },
      { label: 'Strong Wind', description: '20+ mph - Consider windbreaks or delays' },
      { label: 'Evaporation Risk', description: 'Wind accelerates moisture loss from fresh concrete' },
    ],
  },
  pressure: {
    title: 'Atmospheric Pressure',
    icon: 'gauge',
    color: colors.weatherParams.pressure,
    infoTitle: 'About Pressure',
    infoItems: [
      { label: 'Normal Range', description: '29.8 - 30.2 inches of mercury (inHg)' },
      { label: 'High Pressure', description: 'Generally indicates fair weather' },
      { label: 'Low Pressure', description: 'May indicate incoming storms or rain' },
      { label: 'Concrete Impact', description: 'Pressure changes can affect air entrainment' },
    ],
  },
  dewpoint: {
    title: 'Dew Point',
    icon: 'thermometer-low',
    color: colors.weatherParams.dewPoint,
    infoTitle: 'About Dew Point',
    infoItems: [
      { label: 'Definition', description: 'Temperature at which air becomes saturated' },
      { label: 'Comfort Level', description: 'Below 60°F feels comfortable, above 70°F feels humid' },
      { label: 'Condensation Risk', description: 'Concrete below dew point may get moisture' },
      { label: 'Curing Impact', description: 'High dew point can slow surface drying' },
    ],
  },
  humidity: {
    title: 'Relative Humidity',
    icon: 'water-percent',
    color: colors.weatherParams.humidity,
    infoTitle: 'About Humidity',
    infoItems: [
      { label: 'Ideal Range', description: '40-60% for optimal concrete curing' },
      { label: 'Low Humidity', description: 'Below 40% - Increased evaporation risk' },
      { label: 'High Humidity', description: 'Above 80% - Slower surface drying' },
      { label: 'Curing Impact', description: 'Affects moisture loss rate from concrete' },
    ],
  },
  evaporation: {
    title: 'Evaporation Rate',
    icon: 'water-outline',
    color: colors.weatherParams.evaporation,
    infoTitle: 'About Evaporation',
    infoItems: [
      { label: 'Critical Threshold', description: '0.25 lb/ft²/hr - Above requires action' },
      { label: 'Contributing Factors', description: 'Temperature, humidity, wind, concrete temp' },
      { label: 'Prevention', description: 'Fog spraying, windbreaks, evaporation retarders' },
      { label: 'Risk', description: 'High rates cause plastic shrinkage cracking' },
    ],
  },
  products: {
    title: 'Product Recommendations',
    icon: 'package-variant',
    color: colors.secondary.main,
    infoTitle: 'Weather-Based Products',
    infoItems: [
      { label: 'Accelerators', description: 'For cold weather conditions' },
      { label: 'Retarders', description: 'For hot weather conditions' },
      { label: 'Evaporation Control', description: 'For high evaporation risk' },
      { label: 'Curing Compounds', description: 'For optimal hydration' },
    ],
  },
};

interface CircularGaugeProps {
  value: number;
  maxValue: number;
  unit: string;
  color: string;
  size?: number;
}

const CircularGauge: React.FC<CircularGaugeProps> = ({ value, maxValue, unit, color, size = ms(160) }) => {
  const strokeWidth = ms(12);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / maxValue, 1);
  const strokeDashoffset = circumference * (1 - progress * 0.75);

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={THEME_COLORS.text.hint + '30'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          rotation={135}
          origin={`${center}, ${center}`}
        />

        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={strokeDashoffset}
          rotation={135}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.gaugeValueContainer}>
        <Text style={[styles.gaugeValue, { color: THEME_COLORS.text.primary }]}>
          {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 2) : value}
        </Text>
        <Text style={[styles.gaugeUnit, { color: THEME_COLORS.text.secondary }]}>
          {unit}
        </Text>
      </View>
    </View>
  );
};

interface InfoCardProps {
  label: string;
  description: string;
  index: number;
}

const InfoCard: React.FC<InfoCardProps> = ({ label, description, index }) => {
  return (
    <View style={[styles.infoCard, { backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.cardBorder }]}>
      <View style={[styles.infoCardNumber, { backgroundColor: colors.secondary.main + '20' }]}>
        <Text style={[styles.infoCardNumberText, { color: colors.secondary.main }]}>
          {index + 1}
        </Text>
      </View>
      <View style={styles.infoCardContent}>
        <Text style={[styles.infoCardLabel, { color: THEME_COLORS.text.primary }]}>
          {label}
        </Text>
        <Text style={[styles.infoCardDescription, { color: THEME_COLORS.text.secondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
};

export const ProductDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProductDetailsRouteProp>();
  const insets = useSafeAreaInsets();

  const { cardType = 'products', cardValue = 0, cardUnit = '', cardDescription = '', weatherData } = route.params || {};

  const config = cardConfig[cardType];

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const getMaxValue = (type: WeatherCardType): number => {
    switch (type) {
      case 'concrete': return 120;
      case 'wind': return 50;
      case 'pressure': return 31;
      case 'dewpoint': return 100;
      case 'humidity': return 100;
      default: return 100;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME_COLORS.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.background} />

      <LinearGradient
        colors={[...THEME_COLORS.gradient.colors]}
        locations={[...THEME_COLORS.gradient.locations]}
        style={styles.gradientBackground}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >

        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
              <Icon name="chevron-left" size={ms(24)} color={colors.common.white} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{config.title}</Text>

            <View style={styles.headerPlaceholder} />
          </View>

          {weatherData?.location && (
            <View style={styles.locationRow}>
              <Icon name="map-marker" size={ms(14)} color={colors.common.white + 'CC'} />
              <Text style={styles.locationText}>{weatherData.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>

          <View style={[styles.mainCard, { backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.cardBorder }]}>
            <View style={styles.mainCardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
                <Icon name={config.icon} size={ms(28)} color={config.color} />
              </View>
              <View style={styles.mainCardTitleContainer}>
                <Text style={[styles.mainCardTitle, { color: THEME_COLORS.text.primary }]}>
                  Current Reading
                </Text>
                <Text style={[styles.mainCardSubtitle, { color: THEME_COLORS.text.secondary }]}>
                  {cardDescription}
                </Text>
              </View>
            </View>

            <CircularGauge
              value={Number(cardValue)}
              maxValue={getMaxValue(cardType)}
              unit={cardUnit}
              color={config.color}
            />

            {weatherData && (
              <View style={[styles.weatherContext, { backgroundColor: colors.secondary.main + '10' }]}>
                <Icon name="weather-partly-cloudy" size={ms(18)} color={colors.secondary.main} />
                <Text style={[styles.weatherContextText, { color: THEME_COLORS.text.secondary }]}>
                  {weatherData.temperature}°{weatherData.temperatureUnit} • {weatherData.condition}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.infoSection}>
            <Text style={[styles.sectionTitle, { color: THEME_COLORS.text.primary }]}>
              {config.infoTitle}
            </Text>

            {config.infoItems.map((item, index) => (
              <InfoCard
                key={index}
                label={item.label}
                description={item.description}
                index={index}
              />
            ))}
          </View>

          <View style={[styles.tipsCard, { backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.cardBorder }]}>
            <View style={styles.tipsHeader}>
              <Icon name="lightbulb-outline" size={ms(20)} color={colors.warning.main} />
              <Text style={[styles.tipsTitle, { color: THEME_COLORS.text.primary }]}>
                Pro Tips
              </Text>
            </View>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={ms(16)} color={colors.success.main} />
                <Text style={[styles.tipText, { color: THEME_COLORS.text.secondary }]}>
                  Monitor conditions regularly throughout the pour
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={ms(16)} color={colors.success.main} />
                <Text style={[styles.tipText, { color: THEME_COLORS.text.secondary }]}>
                  Adjust mix design based on weather conditions
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={ms(16)} color={colors.success.main} />
                <Text style={[styles.tipText, { color: THEME_COLORS.text.secondary }]}>
                  Document readings for quality control records
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: vs(40),
  },

  header: {
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: GRID.sm,
    paddingTop: GRID.sm,
  },
  headerBackBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.md,
    backgroundColor: colors.common.white + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(18), ms(22)),
    color: colors.common.white,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: ms(40),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GRID.xs,
  },
  locationText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
    color: colors.common.white + 'CC',
  },

  content: {
    padding: GRID.md,
  },

  mainCard: {
    borderRadius: RADIUS.xl,
    padding: GRID.lg,
    borderWidth: 1,
    marginBottom: GRID.md,
    alignItems: 'center',
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: GRID.lg,
  },
  iconContainer: {
    width: ms(56),
    height: ms(56),
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GRID.md,
  },
  mainCardTitleContainer: {
    flex: 1,
  },
  mainCardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(16), ms(20)),
    marginBottom: GRID.xs,
  },
  mainCardSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(12), ms(14)),
    lineHeight: ms(18),
  },

  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: GRID.md,
  },
  gaugeValueContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  gaugeValue: {
    fontFamily: fontFamily.bold,
    fontSize: responsive(ms(42), ms(52)),
    lineHeight: responsive(ms(48), ms(58)),
  },
  gaugeUnit: {
    fontFamily: fontFamily.medium,
    fontSize: responsive(ms(16), ms(20)),
    marginTop: GRID.xs,
  },

  weatherContext: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.md,
    paddingVertical: GRID.sm,
    borderRadius: RADIUS.full,
    gap: GRID.sm,
    marginTop: GRID.md,
  },
  weatherContextText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },

  infoSection: {
    marginBottom: GRID.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(16), ms(20)),
    marginBottom: GRID.md,
  },

  infoCard: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    padding: GRID.md,
    borderWidth: 1,
    marginBottom: GRID.sm,
    alignItems: 'flex-start',
  },
  infoCardNumber: {
    width: ms(28),
    height: ms(28),
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GRID.md,
  },
  infoCardNumberText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(14), ms(16)),
    marginBottom: GRID.xs,
  },
  infoCardDescription: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(12), ms(14)),
    lineHeight: responsive(ms(18), ms(20)),
  },

  tipsCard: {
    borderRadius: RADIUS.xl,
    padding: GRID.md,
    borderWidth: 1,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
    marginBottom: GRID.md,
  },
  tipsTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(15), ms(18)),
  },
  tipsList: {
    gap: GRID.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: GRID.sm,
  },
  tipText: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(12), ms(14)),
    lineHeight: responsive(ms(18), ms(20)),
    flex: 1,
  },
});

export default ProductDetailsScreen;
