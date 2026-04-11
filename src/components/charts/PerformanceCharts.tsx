

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { moderateScale as ms } from 'react-native-size-matters';
import { PourSpeedChart } from './PourSpeedChart';
import { TrucksOnJobChart, ScheduledLoadItem } from './TrucksOnJobChart';
import { TrucksOnJobWebView } from './TrucksOnJobWebView';
import { ODPChartWebView } from './ODPChartWebView';
import type { ODPGraphData } from '../../types/ticket';

export interface PourSpeedGraphApi {
  schedule_rate: number;
  truck_space: number;
  schedule_qty: number;
  unload_duration_minutes?: number;
  y_max: number;
  ordered: Array<{ time: string; time_display: string; rate: number; cumulative_qty?: number }>;
  delivered: Array<{ time: string; time_display: string; rate: number; cumulative_qty?: number; load_qty?: number; actual_spacing_min?: number }>;
  poured: Array<{ time: string; time_display: string; rate: number; cumulative_qty?: number }>;
}

export interface OrderGraphsApi {
  pour_speed?: PourSpeedGraphApi;
  ordered_delivered_poured?: ODPGraphData | null;
}

export interface PerformanceChartsProps {
  graphData?: OrderGraphsApi | null;
  scheduledLoads?: ScheduledLoadItem[];
  scheduledQty?: number;
  truckSpace?: number;
  isDark: boolean;
  chartHeight?: number;
  showPourSpeed?: boolean;
  showODP?: boolean;
  showTrucksOnJob?: boolean;
  scrollable?: boolean;
  pointSpacing?: number;

  useHighchartsWebView?: boolean;

  /**
   * Order identifiers used to fetch ODP chart data DIRECTLY from Supabase
   * (bypassing the scraper API). When all three are provided, the ODP
   * chart reads the same rows the web reads, guaranteeing value parity.
   * See `ODPChartWebView` and `src/services/odpSupabaseFetcher.ts`.
   */
  orderCode?: string;
  orderDate?: string;
  orderId?: number | string;
}

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  graphData,
  scheduledLoads = [],
  scheduledQty = 0,
  truckSpace = 0,
  isDark,
  chartHeight = ms(180),
  showPourSpeed = true,
  showODP = true,
  showTrucksOnJob = true,
  scrollable = true,
  pointSpacing = 80,
  useHighchartsWebView = false,
  orderCode,
  orderDate,
  orderId,
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
          scheduledQty={graphData?.pour_speed?.schedule_qty || scheduledQty}
          truckSpace={graphData?.pour_speed?.truck_space || truckSpace}
          isDark={isDark}
          height={chartHeight}
          scrollable={scrollable}
          minPointSpacing={pointSpacing}
        />
      )}

      {/* ODP (Ordered / Delivered / Poured) — WebView fallback.
          The chart card is rendered entirely inside a WebView that loads
          React + Recharts from a CDN and runs the web's HourlyODPChart
          reducer verbatim on the backend-supplied raw_for_reducer payload.
          Because the exact same charting library draws the exact same
          data, the mobile output is guaranteed to match the web 1:1 in
          values, visibility, UI, and behavior. See ODPChartWebView.tsx. */}
      {showODP && (
        <ODPChartWebView
          data={graphData?.ordered_delivered_poured ?? null}
          isDark={isDark}
          orderCode={orderCode}
          orderDate={orderDate}
          orderId={orderId}
        />
      )}

      {showTrucksOnJob && (
        useHighchartsWebView ? (
          <TrucksOnJobWebView
            scheduledLoads={scheduledLoads}
            isDark={isDark}
            height={chartHeight}
          />
        ) : (
          <TrucksOnJobChart
            scheduledLoads={scheduledLoads}
            isDark={isDark}
            height={chartHeight}
          />
        )
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
