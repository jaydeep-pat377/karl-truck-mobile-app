

import { useMemo } from 'react';
import {
  OrderProductSchedule,
  TicketData,
  PourSpeedGraphData,
  TrucksOnJobGraphData,
  calculatePourSpeedGraph,
  calculateTrucksOnJobGraph,
  calculateOrderedData,
  calculateDeliveredData,
  calculatePouredData,
  calculatePourSpeedYMax,
  processTruckStates,
  calculateOverallAverages,
  calculateTimeRange,
  generateTimeIntervals,
  calculateTrucksOnJob,
} from '../utils/graphCalculations';

export interface ApiGraphData {
  pour_speed?: {
    schedule_rate: number;
    y_max: number;
    ordered: Array<{ time: string; time_display: string; rate: number; cumulative_qty?: number }>;
    delivered: Array<{ time: string; time_display: string; rate: number; cumulative_qty?: number }>;
    poured: Array<{ time: string; time_display: string; rate: number; cumulative_qty?: number }>;
  };
  trucks_on_job?: {
    time_points: Array<{
      time: string;
      time_display: string;
      waiting: number;
      pouring: number;
      washout: number;
      total: number;
    }>;
    averages: {
      avg_waiting_minutes: number;
      avg_pouring_minutes: number;
      avg_washout_minutes: number;
    };
  };
}

export interface UseGraphDataResult {

  pourSpeedData: {
    ordered: Array<{ time: string; time_display: string; rate: number }>;
    delivered: Array<{ time: string; time_display: string; rate: number }>;
    poured: Array<{ time: string; time_display: string; rate: number }>;
    scheduleRate: number;
    yMax: number;
    scheduledQty: number;
    truckSpace: number;
    hasData: boolean;
  };

  trucksOnJobData: {
    timePoints: Array<{
      time: string;
      time_display: string;
      waiting: number;
      pouring: number;
      washout: number;
      total: number;
    }>;
    averages: {
      avg_waiting_minutes: number;
      avg_pouring_minutes: number;
      avg_washout_minutes: number;
    };
    hasData: boolean;
  };

  rawData: {
    pourSpeed: PourSpeedGraphData | null;
    trucksOnJob: TrucksOnJobGraphData | null;
  };
}

interface UseGraphDataProps {

  apiGraphData?: ApiGraphData;


  schedule?: OrderProductSchedule | null;
  tickets?: TicketData[];


  scheduledQty?: number;
  truckSpace?: number;
}

export function useGraphData({
  apiGraphData,
  schedule,
  tickets = [],
  scheduledQty = 0,
  truckSpace = 0,
}: UseGraphDataProps): UseGraphDataResult {

  const pourSpeedData = useMemo(() => {

    if (apiGraphData?.pour_speed) {
      const api = apiGraphData.pour_speed;
      return {
        ordered: api.ordered || [],
        delivered: api.delivered || [],
        poured: api.poured || [],
        scheduleRate: api.schedule_rate || 0,
        yMax: api.y_max || 50,
        scheduledQty: scheduledQty,
        truckSpace: truckSpace,
        hasData: !!(api.ordered?.length || api.delivered?.length || api.poured?.length),
      };
    }


    if (!schedule && tickets.length === 0) {
      return {
        ordered: [],
        delivered: [],
        poured: [],
        scheduleRate: 0,
        yMax: 50,
        scheduledQty: 0,
        truckSpace: 0,
        hasData: false,
      };
    }

    const scheduleRate = schedule ? Number(schedule.delivery_rate_per_hour) || 0 : 0;
    const ordered = schedule ? calculateOrderedData(schedule) : [];
    const delivered = calculateDeliveredData(tickets, scheduleRate);
    const poured = calculatePouredData(tickets, scheduleRate);
    const yMax = calculatePourSpeedYMax(ordered, delivered, poured, scheduleRate);

    return {
      ordered,
      delivered,
      poured,
      scheduleRate,
      yMax,
      scheduledQty: schedule?.schedule_qty || scheduledQty || 0,
      truckSpace: schedule?.truck_space || truckSpace || 0,
      hasData: !!(ordered.length || delivered.length || poured.length),
    };
  }, [apiGraphData?.pour_speed, schedule, tickets, scheduledQty, truckSpace]);


  const trucksOnJobData = useMemo(() => {

    if (apiGraphData?.trucks_on_job) {
      const api = apiGraphData.trucks_on_job;
      return {
        timePoints: api.time_points || [],
        averages: api.averages || {
          avg_waiting_minutes: 0,
          avg_pouring_minutes: 0,
          avg_washout_minutes: 0,
        },
        hasData: !!(api.time_points?.length),
      };
    }


    if (tickets.length === 0) {
      return {
        timePoints: [],
        averages: {
          avg_waiting_minutes: 0,
          avg_pouring_minutes: 0,
          avg_washout_minutes: 0,
        },
        hasData: false,
      };
    }

    const truckStates = processTruckStates(tickets);

    if (truckStates.length === 0) {
      return {
        timePoints: [],
        averages: {
          avg_waiting_minutes: 0,
          avg_pouring_minutes: 0,
          avg_washout_minutes: 0,
        },
        hasData: false,
      };
    }

    const { minTime, maxTime } = calculateTimeRange(schedule || null, tickets);
    const timeIntervals = generateTimeIntervals(minTime, maxTime, 5);

    const timePoints = timeIntervals.map(time => {
      const counts = calculateTrucksOnJob(time, truckStates);
      const timeStr = new Date(time).toISOString();
      const date = new Date(time);
      const timeDisplay = `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;

      return {
        time: timeStr,
        time_display: timeDisplay,
        waiting: counts.waiting,
        pouring: counts.pouring,
        washout: counts.washout,
        total: counts.waiting + counts.pouring + counts.washout,
      };
    });

    const averages = calculateOverallAverages(truckStates);

    return {
      timePoints,
      averages,
      hasData: timePoints.length > 0,
    };
  }, [apiGraphData?.trucks_on_job, schedule, tickets]);


  const rawData = useMemo(() => {
    if (!schedule && tickets.length === 0) {
      return {
        pourSpeed: null,
        trucksOnJob: null,
      };
    }

    return {
      pourSpeed: schedule ? calculatePourSpeedGraph(schedule, tickets) : null,
      trucksOnJob: calculateTrucksOnJobGraph(schedule || null, tickets),
    };
  }, [schedule, tickets]);

  return {
    pourSpeedData,
    trucksOnJobData,
    rawData,
  };
}

export function useConvertTicketsToGraphFormat(
  orderTickets: Array<{
    ticket_id?: string;
    ticket_number?: string;
    ticket_code?: string;
    truck_code?: string;
    load_quantity?: number;
    status?: string;
    timestamps?: {
      eta_at_job?: string | null;
      ticketed?: string | null;
      loading?: string | null;
      loaded?: string | null;
      to_job?: string | null;
      at_job?: string | null;
      pouring?: string | null;
      washing?: string | null;
      to_plant?: string | null;
      at_plant?: string | null;
    };
  }>
): TicketData[] {
  return useMemo(() => {
    if (!orderTickets) return [];

    return orderTickets.map((ticket, index) => ({
      ticket_id: Number(ticket.ticket_id) || index,
      ticket_code: ticket.ticket_code || ticket.ticket_number || '',
      truck_code: ticket.truck_code || null,
      printed_time: ticket.timestamps?.ticketed || null,
      load_time: ticket.timestamps?.loading || null,
      loaded_time: ticket.timestamps?.loaded || null,
      on_job_time: ticket.timestamps?.at_job || null,
      unload_time: ticket.timestamps?.pouring || null,
      wash_time: ticket.timestamps?.washing || null,
      to_plant_time: ticket.timestamps?.to_plant || null,
      at_plant_time: ticket.timestamps?.at_plant || null,
      remove_reason_code: ticket.status === 'cancelled' ? 'CANCELLED' : null,
      ticket_products: [
        {
          ticket_id: Number(ticket.ticket_id) || index,
          is_mix: true,
          load_qty: ticket.load_quantity || 0,
        },
      ],
    }));
  }, [orderTickets]);
}

export default useGraphData;
