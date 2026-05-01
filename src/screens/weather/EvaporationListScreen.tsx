import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Pressable,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Text, Icon } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs } from '../../utils/responsive';
import { RootStackParamList } from '../../navigation/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type EvaporationListRouteProp = RouteProp<RootStackParamList, 'EvaporationList'>;

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

const getEvaporationStatus = (rate: number): string => {
  if (rate >= 0.40) return 'Severe - Immediate Action Required';
  if (rate >= 0.30) return 'Very High - Plastic Shrinkage Cracking Risk';
  if (rate >= 0.20) return 'High - Take Precautions';
  if (rate >= 0.10) return 'Moderate - Monitor Closely';
  return 'Low Risk';
};

const getStatusColor = (rate: number): string => {
  if (rate >= 0.40) return colors.unloadingRate.dark;
  if (rate >= 0.30) return colors.unloadingRate.medium;
  if (rate >= 0.20) return colors.unloadingRate.light;
  if (rate >= 0.10) return colors.warning.main;
  return colors.success.main;
};

interface StatusTableRowProps {
  label: string;
  value: string;
  isLast?: boolean;
  valueColor?: string;
}

const StatusTableRow: React.FC<StatusTableRowProps> = ({
  label,
  value,
  isLast = false,
  valueColor,
}) => (
  <View style={[
    styles.tableRow,
    !isLast && styles.tableRowBorder,
  ]}>
    <Text style={styles.tableLabel}>{label}</Text>
    <Text style={[styles.tableValue, valueColor ? { color: valueColor } : null]}>
      {value}
    </Text>
  </View>
);

interface StatusTableCardProps {
  title: string;
  icon: string;
  data: Array<{ label: string; value: string; valueColor?: string }>;
}

const StatusTableCard: React.FC<StatusTableCardProps> = ({
  title,
  icon,
  data,
}) => {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusCardHeader}>
        <View style={styles.statusCardIconContainer}>
          <Icon name={icon} size={ms(18)} color={colors.secondary.main} />
        </View>
        <Text style={styles.statusCardTitle}>{title}</Text>
      </View>

      <View style={styles.tableContainer}>
        {data.map((item, index) => (
          <StatusTableRow
            key={item.label}
            label={item.label}
            value={item.value}
            valueColor={item.valueColor}
            isLast={index === data.length - 1}
          />
        ))}
      </View>
    </View>
  );
};

interface ExpandableCardProps {
  title: string;
  subtitle?: string;
  icon: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const ExpandableCard: React.FC<ExpandableCardProps> = ({
  title,
  subtitle,
  icon,
  children,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setIsExpanded(!isExpanded);
  }, [isExpanded, rotateAnim]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.expandableCard}>
      <TouchableOpacity
        style={styles.expandableHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}>
        <View style={styles.expandableHeaderLeft}>
          <View style={styles.expandableIconContainer}>
            <Icon name={icon} size={ms(18)} color={colors.secondary.main} />
          </View>
          <View style={styles.expandableTitleContainer}>
            <Text style={styles.expandableTitle}>{title}</Text>
            {subtitle && (
              <Text style={styles.expandableSubtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Icon name="chevron-down" size={ms(22)} color={WEATHER_COLORS.text.hint} />
        </Animated.View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandableContent}>
          {children}
        </View>
      )}
    </View>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, isLast = false }) => (
  <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const LoadingState: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.secondary.main} />
    <Text style={styles.loadingText}>
      Loading evaporation details...
    </Text>
  </View>
);

export const EvaporationListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EvaporationListRouteProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;
  const { locationName, date, orderCode, currentEvaporation, weatherData } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const evaporationRate = currentEvaporation?.value ?? 0;
  const evaporationStatus = getEvaporationStatus(evaporationRate);
  const statusColor = getStatusColor(evaporationRate);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMenuToggle = useCallback(() => {
    setMenuVisible(prev => !prev);
  }, []);

  const handleShare = useCallback(async () => {
    setMenuVisible(false);
    try {
      await Share.share({
        message: `Evaporation Details\nLocation: ${locationName}\nDate: ${date}\nEvaporation Rate: ${evaporationRate.toFixed(2)} kg/m²/hr\nStatus: ${evaporationStatus}\nTemperature: ${weatherData?.temperature ?? 'N/A'}°${weatherData?.temperatureUnit ?? 'F'}\nHumidity: ${weatherData?.humidity ?? 'N/A'}%`,
        title: 'Evaporation Details',
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  }, [locationName, date, evaporationRate, evaporationStatus, weatherData]);

  const handleSettings = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate('Main' as never, { screen: 'Settings' } as never);
  }, [navigation]);

  const menuItems = [
    { id: '1', icon: 'share-variant', label: 'Share Details', onPress: handleShare },
    { id: '2', icon: 'cog-outline', label: 'Settings', onPress: handleSettings },
  ];

  const statusData = [
    { label: 'Status', value: evaporationStatus, valueColor: statusColor },
    { label: 'Evaporation Rate', value: `${evaporationRate.toFixed(2)} kg/m²/hr` },
    { label: 'Evaporation Level', value: currentEvaporation?.status ?? 'N/A' },
    { label: 'Order No', value: orderCode ?? 'N/A' },
  ];

  const weatherDetailsData = [
    { label: 'Temperature', value: weatherData ? `${weatherData.temperature}°${weatherData.temperatureUnit}` : 'N/A' },
    { label: 'Humidity', value: weatherData ? `${weatherData.humidity}%` : 'N/A' },
    { label: 'Wind Speed', value: weatherData ? `${weatherData.windSpeed} mph` : 'N/A' },
    { label: 'Wind Direction', value: weatherData?.windDirection ?? 'N/A' },
    { label: 'Pressure', value: weatherData ? `${weatherData.pressure.toFixed(2)} ${weatherData.pressureUnit}` : 'N/A' },
    { label: 'Dew Point', value: weatherData ? `${weatherData.dewPoint}°F` : 'N/A' },
    { label: 'Concrete Temp', value: weatherData?.concreteTemp ? `${weatherData.concreteTemp}°F` : 'N/A' },
    { label: 'Condition', value: weatherData?.condition ?? 'N/A' },
    { label: 'Clouds', value: weatherData ? `${weatherData.cloudsPercentage}%` : 'N/A' },
    { label: 'Visibility', value: weatherData ? `${(weatherData.visibility / 1000).toFixed(1)} km` : 'N/A' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={WEATHER_COLORS.background} />

      <LinearGradient
        colors={[...WEATHER_COLORS.gradient.colors]}
        locations={[...WEATHER_COLORS.gradient.locations]}
        style={styles.gradientBackground}
      />

      <View style={[styles.header, { paddingTop: insets.top + GRID.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleBack}
            activeOpacity={0.7}>
            <Icon name="arrow-left" size={22} color={colors.common.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t('weather.evaporationDetails')}</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleMenuToggle}
              activeOpacity={0.7}>
              <Icon name="dots-vertical" size={20} color={colors.common.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerSubtitleRow}>
          <Icon name="map-marker" size={14} color={colors.common.white + 'AA'} />
          <Text style={styles.headerSubtitle}>{locationName}</Text>
          <View style={styles.headerDot} />
          <Text style={styles.headerSubtitle}>{date}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.common.white}
            colors={[colors.primary.main, colors.secondary.main]}
            progressBackgroundColor={isDark ? themeColors.cardElevated : colors.common.white}
          />
        }>
        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            <StatusTableCard
              title="Evaporation Status"
              icon="water-outline"
              data={statusData}
            />

            <ExpandableCard
              title="Weather Details"
              subtitle="Current weather conditions affecting evaporation rate."
              icon="weather-partly-cloudy"
              defaultExpanded={true}>
              {weatherDetailsData.map((item, index) => (
                <DetailRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  isLast={index === weatherDetailsData.length - 1}
                />
              ))}
            </ExpandableCard>

            <ExpandableCard
              title="References"
              icon="book-open-variant"
              defaultExpanded={false}>
              <Text style={styles.referenceText}>
                ACI 305, "Hot Weather Concreting," ACI Manual of Concrete Practice, Part 2. American Concrete Institute, P.O. Box 19150, Detroit, Michigan 48219.
              </Text>
            </ExpandableCard>
          </>
        )}
      </ScrollView>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleMenuToggle}>
        <Pressable style={styles.modalOverlay} onPress={handleMenuToggle}>
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>{t('common.menu')}</Text>
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
                <Text style={styles.menuItemLabel}>
                  {item.label}
                </Text>
                <Icon name="chevron-right" size={ms(18)} color={WEATHER_COLORS.text.hint} />
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WEATHER_COLORS.background,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: colors.common.white + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
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
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: GRID.sm,
    gap: GRID.xs,
  },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    color: colors.common.white + 'AA',
  },
  headerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.common.white + '60',
    marginHorizontal: GRID.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: GRID.md,
    paddingBottom: GRID.xl,
  },
  statusCard: {
    backgroundColor: WEATHER_COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: WEATHER_COLORS.cardBorder,
    marginBottom: GRID.md,
    overflow: 'hidden',
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: GRID.md,
    borderBottomWidth: 1,
    borderBottomColor: WEATHER_COLORS.cardBorder,
    gap: GRID.sm,
  },
  statusCardIconContainer: {
    width: ms(36),
    height: ms(36),
    borderRadius: RADIUS.md,
    backgroundColor: colors.secondary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    color: WEATHER_COLORS.text.primary,
  },
  tableContainer: {
    paddingHorizontal: GRID.md,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: GRID.sm + GRID.xs,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: WEATHER_COLORS.cardBorder + '60',
  },
  tableLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(13),
    color: WEATHER_COLORS.text.secondary,
    flex: 1,
  },
  tableValue: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
    color: WEATHER_COLORS.text.primary,
    textAlign: 'right',
    flex: 1,
  },
  expandableCard: {
    backgroundColor: WEATHER_COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: WEATHER_COLORS.cardBorder,
    marginBottom: GRID.md,
    overflow: 'hidden',
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: GRID.md,
  },
  expandableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: GRID.sm,
  },
  expandableIconContainer: {
    width: ms(36),
    height: ms(36),
    borderRadius: RADIUS.md,
    backgroundColor: colors.secondary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandableTitleContainer: {
    flex: 1,
    paddingRight: GRID.sm,
  },
  expandableTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    color: WEATHER_COLORS.text.primary,
  },
  expandableSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    color: WEATHER_COLORS.text.hint,
    marginTop: GRID.xs,
    lineHeight: ms(16),
  },
  expandableContent: {
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.md,
    borderTopWidth: 1,
    borderTopColor: WEATHER_COLORS.cardBorder + '60',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: GRID.sm,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: WEATHER_COLORS.cardBorder + '40',
  },
  detailLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    color: WEATHER_COLORS.text.secondary,
  },
  detailValue: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    color: WEATHER_COLORS.text.primary,
  },
  referenceText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    color: WEATHER_COLORS.text.secondary,
    lineHeight: ms(18),
    marginTop: ms(10)
  },
  levelCard: {
    backgroundColor: WEATHER_COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: WEATHER_COLORS.cardBorder,
    padding: GRID.md,
    marginBottom: GRID.md,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
    marginBottom: GRID.md,
  },
  levelTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    color: WEATHER_COLORS.text.primary,
  },
  levelProgressContainer: {
    position: 'relative',
    height: vs(20),
    justifyContent: 'center',
    marginBottom: GRID.sm,
  },
  levelProgressBar: {
    height: vs(6),
    borderRadius: vs(3),
  },
  levelIndicator: {
    position: 'absolute',
    top: vs(3),
    marginLeft: ms(-7),
  },
  levelIndicatorDot: {
    width: ms(14),
    height: ms(14),
    borderRadius: ms(7),
    backgroundColor: colors.common.white,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  levelLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GRID.md,
  },
  levelLabelText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    color: WEATHER_COLORS.text.hint,
  },
  levelStatusRow: {
    paddingTop: GRID.sm,
    borderTopWidth: 1,
    borderTopColor: WEATHER_COLORS.cardBorder + '60',
  },
  levelStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.full,
    gap: GRID.xs,
    marginBottom: GRID.sm,
  },
  levelStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelStatusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },
  levelDescription: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    color: WEATHER_COLORS.text.secondary,
    lineHeight: ms(18),
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: GRID.sm,
    marginTop: GRID.sm,
  },
  actionButton: {
    flex: 2,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.md,
    gap: GRID.sm,
  },
  actionButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.common.white,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.md,
    borderRadius: RADIUS.lg,
    backgroundColor: colors.secondary.main + '15',
    borderWidth: 1,
    borderColor: colors.secondary.main + '30',
    gap: GRID.sm,
  },
  actionButtonSecondaryText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.secondary.main,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.xl * 2,
  },
  loadingText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
    color: WEATHER_COLORS.text.secondary,
    marginTop: GRID.md,
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
    color: WEATHER_COLORS.text.primary,
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
    color: WEATHER_COLORS.text.primary,
  },
});

export default EvaporationListScreen;
