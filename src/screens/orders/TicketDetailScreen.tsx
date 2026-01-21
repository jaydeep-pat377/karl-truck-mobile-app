import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../../components/common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs } from '../../utils/responsive';
import { RootStackParamList, TicketDetailScreenParams } from '../../navigation/types';

type TicketDetailRouteProp = RouteProp<RootStackParamList, 'TicketDetail'>;
type TicketStatus = TicketDetailScreenParams['status'];

// Design constants
const GRID = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24 };

// Gradient colors
const HEADER_GRADIENT = ['#1565C0', '#1976D2', '#2196F3'];

interface StatusConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  progressStep: number;
}

const STATUS_CONFIG: Record<TicketStatus, StatusConfig> = {
  at_plant: {
    label: 'At Plant',
    icon: 'factory',
    color: '#FF9800',
    bgColor: '#FFF3E0',
    progressStep: 0,
  },
  in_transit: {
    label: 'In Transit',
    icon: 'truck-fast',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    progressStep: 1,
  },
  at_site: {
    label: 'At Site',
    icon: 'map-marker-check',
    color: '#9C27B0',
    bgColor: '#F3E5F5',
    progressStep: 2,
  },
  pouring: {
    label: 'Pouring',
    icon: 'water',
    color: '#00BCD4',
    bgColor: '#E0F7FA',
    progressStep: 3,
  },
  completed: {
    label: 'Completed',
    icon: 'check-circle',
    color: '#4CAF50',
    bgColor: '#E8F5E9',
    progressStep: 4,
  },
  returning: {
    label: 'Returning',
    icon: 'truck-delivery',
    color: '#607D8B',
    bgColor: '#ECEFF1',
    progressStep: 4,
  },
};

const TIMELINE_STEPS = [
  { key: 'at_plant', label: 'At Plant', icon: 'factory', time: '07:30 AM' },
  { key: 'in_transit', label: 'In Transit', icon: 'truck-fast', time: '07:45 AM' },
  { key: 'at_site', label: 'At Site', icon: 'map-marker-check', time: '08:15 AM' },
  { key: 'pouring', label: 'Pouring', icon: 'water', time: '08:20 AM' },
  { key: 'completed', label: 'Completed', icon: 'check-circle', time: '08:45 AM' },
];

// Section Card Component
interface SectionCardProps {
  title: string;
  icon: string;
  iconColor: string;
  children: React.ReactNode;
  isDark: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, icon, iconColor, children, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.sectionCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconBox, { backgroundColor: `${iconColor}15` }]}>
          <Icon name={icon} size={ms(18)} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

// Detail Row Component
interface DetailRowProps {
  label: string;
  value?: string;
  icon?: string;
  iconColor?: string;
  isDark: boolean;
  isLast?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon, iconColor, isDark, isLast }) => {
  const themeColors = isDark ? colors.dark : colors.light;

  if (!value) return null;

  return (
    <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
      {icon && (
        <Icon
          name={icon}
          size={ms(16)}
          color={iconColor || themeColors.text.hint}
          style={styles.detailIcon}
        />
      )}
      <Text style={[styles.detailLabel, { color: themeColors.text.hint }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: themeColors.text.primary }]}>{value}</Text>
    </View>
  );
};

// Vertical Timeline Component
interface VerticalTimelineProps {
  currentStep: number;
  isDark: boolean;
}

const VerticalTimeline: React.FC<VerticalTimelineProps> = ({ currentStep, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={styles.verticalTimeline}>
      {TIMELINE_STEPS.map((step, index) => {
        const isCompleted = index <= currentStep;
        const isActive = index === currentStep;
        const stepColor = isCompleted ? '#4CAF50' : themeColors.border;

        return (
          <View key={step.key} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View
                style={[
                  styles.timelineIcon,
                  {
                    backgroundColor: isCompleted ? stepColor : themeColors.surface,
                    borderColor: stepColor,
                  },
                  isActive && styles.timelineIconActive,
                ]}>
                <Icon
                  name={isCompleted ? 'check' : step.icon}
                  size={ms(14)}
                  color={isCompleted ? colors.common.white : themeColors.text.hint}
                />
              </View>
              {index < TIMELINE_STEPS.length - 1 && (
                <View
                  style={[
                    styles.timelineVerticalLine,
                    { backgroundColor: index < currentStep ? '#4CAF50' : themeColors.border },
                  ]}
                />
              )}
            </View>
            <View style={styles.timelineContent}>
              <View style={styles.timelineHeader}>
                <Text
                  style={[
                    styles.timelineStepLabel,
                    { color: isCompleted ? themeColors.text.primary : themeColors.text.hint },
                    isActive && { fontFamily: fontFamily.semiBold, color: '#1976D2' },
                  ]}>
                  {step.label}
                </Text>
                {isCompleted && (
                  <Text style={[styles.timelineTime, { color: themeColors.text.hint }]}>
                    {step.time}
                  </Text>
                )}
              </View>
              {isActive && (
                <View style={styles.activeIndicator}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>Current Status</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Quick Action Button Component
interface QuickActionProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  isDark: boolean;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, color, onPress, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <TouchableOpacity
      style={[styles.quickAction, { backgroundColor: themeColors.card }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
        <Icon name={icon} size={ms(20)} color={color} />
      </View>
      <Text style={[styles.quickActionLabel, { color: themeColors.text.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
};

export const TicketDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<TicketDetailRouteProp>();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const themeColors = isDark ? colors.dark : colors.light;

  const {
    ticketNumber,
    truckName,
    loadQuantity,
    totalOrderQuantity,
    unit,
    status,
    scheduledTime,
    driverName,
    driverPhone,
    orderCode,
    // Product/Mix Information
    productCode,
    productName,
    mixDesign,
    slump,
    // Delivery Location
    deliveryAddress,
    deliveryCity,
    // Customer Information
    customerName,
    customerPhone,
    customerCompany,
    // Additional Details
    specialInstructions,
    plantName,
    estimatedArrival,
    distance,
  } = route.params;

  const statusInfo = STATUS_CONFIG[status];
  const percentage = (loadQuantity / totalOrderQuantity) * 100;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCallDriver = useCallback(() => {
    if (driverPhone) {
      Linking.openURL(`tel:${driverPhone}`);
    }
  }, [driverPhone]);

  const handleCallCustomer = useCallback(() => {
    if (customerPhone) {
      Linking.openURL(`tel:${customerPhone}`);
    }
  }, [customerPhone]);

  const handleTrackTruck = useCallback(() => {
    console.log('Track truck pressed');
  }, []);

  const handleGetDirections = useCallback(() => {
    if (deliveryAddress && deliveryCity) {
      const address = encodeURIComponent(`${deliveryAddress}, ${deliveryCity}`);
      Linking.openURL(`https://maps.google.com/?q=${address}`);
    }
  }, [deliveryAddress, deliveryCity]);

  const handleViewTicket = useCallback(() => {
    console.log('View ticket document');
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_GRADIENT[0]} />

      {/* Gradient Header */}
      <LinearGradient
        colors={HEADER_GRADIENT}
        style={[styles.header, { paddingTop: insets.top }]}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleBack}
            activeOpacity={0.7}>
            <Icon name="arrow-left" size={ms(22)} color={colors.common.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleSection}>
            <Text style={styles.headerTitle}>Ticket Details</Text>
            {orderCode && (
              <Text style={styles.headerSubtitle}>Order #{orderCode}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={handleViewTicket} activeOpacity={0.7}>
            <Icon name="file-document-outline" size={ms(20)} color={colors.common.white} />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroLeft}>
            <View style={styles.ticketNumberRow}>
              <Icon name="ticket-confirmation" size={ms(16)} color="rgba(255,255,255,0.8)" />
              <Text style={styles.ticketLabel}>TICKET</Text>
            </View>
            <Text style={styles.ticketNumber}>{ticketNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Icon name={statusInfo.icon} size={ms(14)} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
          <View style={styles.heroRight}>
            {/* ETA Badge */}
            {estimatedArrival && status !== 'completed' && (
              <View style={styles.etaBadge}>
                <Text style={styles.etaLabel}>ETA</Text>
                <Text style={styles.etaValue}>{estimatedArrival}</Text>
              </View>
            )}
            <View style={styles.truckIconContainer}>
              <Icon name="truck-delivery" size={ms(44)} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="map-marker-radius"
            label="Track"
            color="#1976D2"
            onPress={handleTrackTruck}
            isDark={isDark}
          />
          <QuickAction
            icon="directions"
            label="Directions"
            color="#4CAF50"
            onPress={handleGetDirections}
            isDark={isDark}
          />
          <QuickAction
            icon="phone"
            label="Call Driver"
            color="#FF9800"
            onPress={handleCallDriver}
            isDark={isDark}
          />
          <QuickAction
            icon="account-box"
            label="Customer"
            color="#9C27B0"
            onPress={handleCallCustomer}
            isDark={isDark}
          />
        </View>

        {/* Load Progress Card */}
        <View style={[styles.progressCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.progressCardHeader}>
            <View style={styles.progressTitleRow}>
              <Icon name="package-variant" size={ms(18)} color="#1976D2" />
              <Text style={[styles.progressCardTitle, { color: themeColors.text.primary }]}>
                Load Details
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>{percentage.toFixed(1)}%</Text>
            </View>
          </View>

          <View style={styles.loadStatsRow}>
            <View style={styles.loadStatItem}>
              <Text style={[styles.loadStatValue, { color: '#1976D2' }]}>
                {loadQuantity.toFixed(2)}
              </Text>
              <Text style={[styles.loadStatLabel, { color: themeColors.text.hint }]}>
                This Load ({unit})
              </Text>
            </View>
            <View style={[styles.loadStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.loadStatItem}>
              <Text style={[styles.loadStatValue, { color: themeColors.text.primary }]}>
                {totalOrderQuantity}
              </Text>
              <Text style={[styles.loadStatLabel, { color: themeColors.text.hint }]}>
                Total Order ({unit})
              </Text>
            </View>
            <View style={[styles.loadStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.loadStatItem}>
              <Text style={[styles.loadStatValue, { color: '#4CAF50' }]}>
                {(totalOrderQuantity - loadQuantity).toFixed(2)}
              </Text>
              <Text style={[styles.loadStatLabel, { color: themeColors.text.hint }]}>
                Remaining ({unit})
              </Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: themeColors.border }]}>
              <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
            </View>
          </View>
        </View>

        {/* Product/Mix Information */}
        <SectionCard
          title="Product Information"
          icon="beaker-outline"
          iconColor="#00BCD4"
          isDark={isDark}>
          <DetailRow label="Product Code" value={productCode} isDark={isDark} />
          <DetailRow label="Product Name" value={productName} isDark={isDark} />
          <DetailRow label="Mix Design" value={mixDesign} isDark={isDark} />
          <DetailRow label="Slump" value={slump} isDark={isDark} isLast />
        </SectionCard>

        {/* Delivery Location */}
        <SectionCard
          title="Delivery Location"
          icon="map-marker"
          iconColor="#E91E63"
          isDark={isDark}>
          <DetailRow label="Address" value={deliveryAddress} isDark={isDark} />
          <DetailRow label="City" value={deliveryCity} isDark={isDark} />
          <DetailRow label="Distance" value={distance} isDark={isDark} isLast />

          {/* Map Preview Placeholder */}
          <TouchableOpacity
            style={[styles.mapPreview, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}
            onPress={handleGetDirections}
            activeOpacity={0.8}>
            <Icon name="map" size={ms(32)} color={themeColors.text.hint} />
            <Text style={[styles.mapPreviewText, { color: themeColors.text.hint }]}>
              Tap to open in Maps
            </Text>
          </TouchableOpacity>
        </SectionCard>

        {/* Customer Information */}
        <SectionCard
          title="Customer Information"
          icon="account-group"
          iconColor="#673AB7"
          isDark={isDark}>
          <DetailRow label="Company" value={customerCompany} isDark={isDark} />
          <DetailRow label="Contact" value={customerName} isDark={isDark} />
          <DetailRow label="Phone" value={customerPhone} isDark={isDark} isLast />

          {customerPhone && (
            <TouchableOpacity
              style={styles.callCustomerBtn}
              onPress={handleCallCustomer}
              activeOpacity={0.8}>
              <Icon name="phone" size={ms(18)} color="#673AB7" />
              <Text style={styles.callCustomerText}>Call Customer</Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* Truck & Driver Information */}
        <SectionCard
          title="Truck & Driver"
          icon="truck"
          iconColor="#FF5722"
          isDark={isDark}>
          <DetailRow label="Truck" value={truckName} isDark={isDark} />
          <DetailRow label="Plant" value={plantName} isDark={isDark} />
          <DetailRow label="Driver" value={driverName} isDark={isDark} />
          <DetailRow label="Driver Phone" value={driverPhone} isDark={isDark} />
          <DetailRow label="Scheduled" value={scheduledTime} isDark={isDark} />
          {estimatedArrival && (
            <DetailRow label="ETA" value={estimatedArrival} isDark={isDark} isLast />
          )}
        </SectionCard>

        {/* Special Instructions */}
        {specialInstructions && (
          <SectionCard
            title="Special Instructions"
            icon="alert-circle-outline"
            iconColor="#FF9800"
            isDark={isDark}>
            <View style={styles.instructionsBox}>
              <Text style={[styles.instructionsText, { color: themeColors.text.primary }]}>
                {specialInstructions}
              </Text>
            </View>
          </SectionCard>
        )}

        {/* Delivery Timeline */}
        <SectionCard
          title="Delivery Timeline"
          icon="timeline-clock"
          iconColor="#1976D2"
          isDark={isDark}>
          <VerticalTimeline currentStep={statusInfo.progressStep} isDark={isDark} />
        </SectionCard>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleTrackTruck}
            activeOpacity={0.8}>
            <LinearGradient
              colors={HEADER_GRADIENT}
              style={styles.primaryBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}>
              <Icon name="map-marker-radius" size={ms(20)} color={colors.common.white} />
              <Text style={styles.primaryBtnText}>Track Truck on Map</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.secondaryBtnsRow}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: themeColors.card }]}
              onPress={handleViewTicket}
              activeOpacity={0.8}>
              <Icon name="file-document" size={ms(18)} color="#1976D2" />
              <Text style={[styles.secondaryBtnText, { color: themeColors.text.primary }]}>
                View Ticket
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: themeColors.card }]}
              activeOpacity={0.8}>
              <Icon name="alert-circle" size={ms(18)} color="#FF9800" />
              <Text style={[styles.secondaryBtnText, { color: themeColors.text.primary }]}>
                Report Issue
              </Text>
            </TouchableOpacity>
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
  // Header
  header: {
    paddingBottom: GRID.lg,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID.md,
    paddingTop: GRID.sm,
    marginBottom: GRID.sm,
  },
  headerBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleSection: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(17),
    color: colors.common.white,
  },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    color: 'rgba(255,255,255,0.7)',
    marginTop: ms(2),
  },
  // Hero Section
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID.lg,
  },
  heroLeft: {},
  heroRight: {
    alignItems: 'center',
  },
  ticketNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.xs,
    marginBottom: GRID.xs,
  },
  ticketLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  ticketNumber: {
    fontFamily: fontFamily.bold,
    fontSize: ms(28),
    color: colors.common.white,
    marginBottom: GRID.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: GRID.xs,
    paddingHorizontal: GRID.sm,
    borderRadius: RADIUS.xl,
    gap: GRID.xs,
  },
  statusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(11),
  },
  etaBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: GRID.xs,
    paddingHorizontal: GRID.sm + 2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: GRID.sm,
  },
  etaLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
    color: 'rgba(255,255,255,0.7)',
  },
  etaValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(14),
    color: colors.common.white,
  },
  truckIconContainer: {
    width: ms(70),
    height: ms(70),
    borderRadius: ms(35),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: GRID.md,
    paddingBottom: vs(40),
  },
  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    marginBottom: GRID.md,
    gap: GRID.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: GRID.md,
    borderRadius: RADIUS.md,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: GRID.xs,
  },
  quickActionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
  },
  // Progress Card
  progressCard: {
    borderRadius: RADIUS.lg,
    padding: GRID.md,
    marginBottom: GRID.md,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: GRID.md,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
  },
  progressCardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
  },
  progressBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: GRID.xs - 2,
    paddingHorizontal: GRID.sm,
    borderRadius: RADIUS.xl,
  },
  progressBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(11),
    color: '#1976D2',
  },
  loadStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: GRID.md,
  },
  loadStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  loadStatValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(20),
  },
  loadStatLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    marginTop: ms(2),
  },
  loadStatDivider: {
    width: 1,
    height: ms(30),
  },
  progressBarContainer: {
    marginTop: GRID.xs,
  },
  progressBarBg: {
    height: ms(6),
    borderRadius: ms(3),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: ms(3),
  },
  // Section Card
  sectionCard: {
    borderRadius: RADIUS.lg,
    padding: GRID.md,
    marginBottom: GRID.md,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: GRID.md,
  },
  sectionIconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GRID.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
  },
  // Detail Row
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: GRID.sm,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailIcon: {
    marginRight: GRID.sm,
  },
  detailLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    flex: 1,
  },
  detailValue: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
    textAlign: 'right',
    maxWidth: '60%',
  },
  // Map Preview
  mapPreview: {
    height: ms(80),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: GRID.md,
  },
  mapPreviewText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
    marginTop: GRID.xs,
  },
  // Call Customer Button
  callCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GRID.sm,
    marginTop: GRID.md,
    paddingVertical: GRID.sm,
    backgroundColor: '#673AB715',
    borderRadius: RADIUS.md,
  },
  callCustomerText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
    color: '#673AB7',
  },
  // Instructions
  instructionsBox: {
    backgroundColor: '#FFF3E0',
    padding: GRID.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  instructionsText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(13),
    lineHeight: ms(20),
  },
  // Vertical Timeline
  verticalTimeline: {},
  timelineItem: {
    flexDirection: 'row',
    minHeight: ms(48),
  },
  timelineLeft: {
    width: ms(36),
    alignItems: 'center',
  },
  timelineIcon: {
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineIconActive: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timelineVerticalLine: {
    width: ms(2),
    flex: 1,
    marginVertical: ms(2),
  },
  timelineContent: {
    flex: 1,
    paddingLeft: GRID.sm,
    paddingBottom: GRID.sm,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineStepLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
  },
  timelineTime: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: GRID.xs,
  },
  activeDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    backgroundColor: '#1976D2',
    marginRight: GRID.xs,
  },
  activeText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
    color: '#1976D2',
  },
  // Action Buttons
  actionSection: {
    marginTop: GRID.sm,
  },
  primaryBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: GRID.md,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GRID.sm,
    paddingVertical: GRID.lg,
  },
  primaryBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    color: colors.common.white,
  },
  secondaryBtnsRow: {
    flexDirection: 'row',
    gap: GRID.md,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GRID.sm,
    paddingVertical: GRID.md,
    borderRadius: RADIUS.md,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
});

export default TicketDetailScreen;
