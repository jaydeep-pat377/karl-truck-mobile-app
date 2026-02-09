/**
 * Performance Charts Container
 *
 * A combined component that renders both Pour Speed and Trucks on Job charts.
 * This is designed to be used in the OrderDetailsScreen.
 *
 * Usage:
 * ```tsx
 * import { PerformanceCharts } from '@/components/charts/PerformanceCharts';
 *
 * <PerformanceCharts
 *   graphData={orderDetails.graphs}
 *   scheduledQty={orderDetails.ordered_qty}
 *   truckSpace={schedule?.truck_space}
 *   isDark={isDark}
 * />
 * ```
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { moderateScale as ms } from 'react-native-size-matters';
import { PourSpeedChart } from './PourSpeedChart';
import { TrucksOnJobChart } from './TrucksOnJobChart';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';

// ============================================================================
// TYPES
// ============================================================================

export interface PourSpeedGraphApi {
  schedule_rate: number;
  y_max: number;
  ordered: Array<{ time: string; time_display: string; rate: number; cumulative_qty?: number }>;
  delivered: Array<{ time: string; time_display: string; rate: number; cumulative_qty?: number; load_qty?: number; actual_spacing_min?: number }>;
  poured: Array<{ time: string; time_display: string; rate: number; cumulative_qty?: number }>;
}

export interface TrucksOnJobGraphApi {
  time_points: Array<{
    time: string;
    time_display: string;
    waiting: number;
    pouring: number;
    washout: number;
    total: number;
    avg_waiting_minutes?: number | null;
    avg_pouring_minutes?: number | null;
    avg_washing_minutes?: number | null;
  }>;
  averages: {
    avg_waiting_minutes: number;
    avg_pouring_minutes: number;
    avg_washout_minutes: number;
  };
}

export interface OrderGraphsApi {
  pour_speed?: PourSpeedGraphApi;
  trucks_on_job?: TrucksOnJobGraphApi;
}

export interface PerformanceChartsProps {
  /** Graph data from API */
  graphData?: OrderGraphsApi | null;
  /** Scheduled quantity for display */
  scheduledQty?: number;
  /** Truck spacing in minutes */
  truckSpace?: number;
  /** Dark mode flag */
  isDark: boolean;
  /** Chart height */
  chartHeight?: number;
  /** Show Pour Speed chart */
  showPourSpeed?: boolean;
  /** Show Trucks on Job chart */
  showTrucksOnJob?: boolean;
  /** Display mode for Trucks on Job chart */
  trucksDisplayMode?: 'line' | 'area';
  /** Enable horizontal scrolling for charts */
  scrollable?: boolean;
  /** Spacing between data points in pixels (default: 80) - higher = more gap */
  pointSpacing?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  graphData,
  scheduledQty = 0,
  truckSpace = 0,
  isDark,
  chartHeight = ms(180),
  showPourSpeed = true,
  showTrucksOnJob = true,
  trucksDisplayMode = 'line',
  scrollable = true,
  pointSpacing = 80,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;

  // Check if we have data for each chart
  const hasPourSpeedData = !!(
    graphData?.pour_speed?.ordered?.length ||
    graphData?.pour_speed?.delivered?.length ||
    graphData?.pour_speed?.poured?.length
  );

  const hasTrucksOnJobData = !!(graphData?.trucks_on_job?.time_points?.length);

  // No data at all
  if (!hasPourSpeedData && !hasTrucksOnJobData) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: themeColors.card }]}>
        <Text style={[styles.emptyText, { color: themeColors.text.hint }]}>
          No performance data available for this order.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Pour Speed Chart */}
      {showPourSpeed && hasPourSpeedData && graphData?.pour_speed && (
        <PourSpeedChart
          orderedData={graphData.pour_speed.ordered || []}
          deliveredData={graphData.pour_speed.delivered || []}
          pouredData={graphData.pour_speed.poured || []}
          scheduleRate={graphData.pour_speed.schedule_rate || 0}
          yMax={graphData.pour_speed.y_max || 50}
          scheduledQty={scheduledQty}
          truckSpace={truckSpace}
          isDark={isDark}
          height={chartHeight}
          scrollable={scrollable}
          minPointSpacing={pointSpacing}
        />
      )}

      {/* Trucks on Job Chart */}
      {showTrucksOnJob && hasTrucksOnJobData && graphData?.trucks_on_job && (
        <TrucksOnJobChart
          timePoints={graphData.trucks_on_job.time_points || []}
          averages={graphData.trucks_on_job.averages || {
            avg_waiting_minutes: 0,
            avg_pouring_minutes: 0,
            avg_washout_minutes: 0,
          }}
          isDark={isDark}
          height={chartHeight}
          displayMode={trucksDisplayMode}
          scrollable={scrollable}
          minPointSpacing={pointSpacing}
        />
      )}

      {/* Show message if only one chart has no data */}
      {showPourSpeed && !hasPourSpeedData && hasTrucksOnJobData && (
        <View style={[styles.noDataCard, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.noDataText, { color: themeColors.text.hint }]}>
            Pour speed data not available yet.
          </Text>
        </View>
      )}

      {showTrucksOnJob && !hasTrucksOnJobData && hasPourSpeedData && (
        <View style={[styles.noDataCard, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.noDataText, { color: themeColors.text.hint }]}>
            Trucks on job data not available yet.
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: ms(8),
  },
  emptyContainer: {
    borderRadius: ms(12),
    padding: ms(24),
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: ms(8),
  },
  emptyText: {
    fontSize: ms(13),
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
  noDataCard: {
    borderRadius: ms(12),
    padding: ms(16),
    alignItems: 'center',
    marginVertical: ms(4),
  },
  noDataText: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
  },
});

export default PerformanceCharts;
