

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { moderateScale as ms } from 'react-native-size-matters';
import { PourSpeedChart } from './PourSpeedChart';
import { TrucksOnJobChart } from './TrucksOnJobChart';

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

  graphData?: OrderGraphsApi | null;

  scheduledQty?: number;

  truckSpace?: number;

  isDark: boolean;

  chartHeight?: number;

  showPourSpeed?: boolean;

  showTrucksOnJob?: boolean;

  trucksDisplayMode?: 'line' | 'area';

  scrollable?: boolean;

  pointSpacing?: number;
}

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
  return (
    <View style={styles.container}>
      {showPourSpeed && (
        <PourSpeedChart
          orderedData={graphData?.pour_speed?.ordered || []}
          deliveredData={graphData?.pour_speed?.delivered || []}
          pouredData={graphData?.pour_speed?.poured || []}
          scheduleRate={graphData?.pour_speed?.schedule_rate || 0}
          yMax={graphData?.pour_speed?.y_max || 50}
          scheduledQty={scheduledQty}
          truckSpace={truckSpace}
          isDark={isDark}
          height={chartHeight}
          scrollable={scrollable}
          minPointSpacing={pointSpacing}
        />
      )}

      {showTrucksOnJob && (
        <TrucksOnJobChart
          timePoints={graphData?.trucks_on_job?.time_points || []}
          averages={graphData?.trucks_on_job?.averages || {
            avg_waiting_minutes: 0,
            avg_pouring_minutes: 0,
            avg_washout_minutes: 0,
          }}
          isDark={isDark}
          height={chartHeight}
          scrollable={scrollable}
          minPointSpacing={pointSpacing}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: ms(8),
  },
});

export default PerformanceCharts;
