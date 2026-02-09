/**
 * Graph Calculations Utility
 *
 * Implements the logic for calculating Pour Speed and Trucks on Job chart data
 * from raw ticket and schedule data, matching the web app's performance-charts logic.
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Schedule data for an order product
 */
export interface OrderProductSchedule {
  id: number;
  start_time: string;              // Schedule start time (ISO timestamp)
  schedule_qty: number;            // Total ordered quantity in CY
  truck_space: number | null;      // Minutes between scheduled trucks
  unload_time: number;             // Minutes per truck unload
  delivery_rate_per_hour: number;  // Scheduled CY/HR rate
  number_of_loads: number;         // Number of scheduled trucks
  load_qty: number;                // CY per truck load
  loads?: OrderProductScheduleLoad[];
}

/**
 * Scheduled load data
 */
export interface OrderProductScheduleLoad {
  id: number;
  order_product_schedule_id: number;
  load_qty: number;
  truck_code: string | null;
  on_job_time: string | null;      // Actual arrival time
  fin_pour_time: string | null;    // Actual finish pour time
  at_plant_time: string | null;
  unload_time: number | null;
  sequence?: number | null;
  ticket_id: number | null;
}

/**
 * Ticket data from API
 */
export interface TicketData {
  ticket_id: number;
  ticket_code: string;
  truck_code: string | null;
  printed_time: string | null;
  load_time: string | null;
  loaded_time: string | null;
  on_job_time: string | null;      // "At Job" - truck arrival at job site
  unload_time: string | null;      // "Pouring" - pour start time
  wash_time: string | null;        // "Washing" - pour finish / wash start
  to_plant_time: string | null;    // "To Plant" - truck leaves job site
  at_plant_time: string | null;    // "At Plant" - truck arrives at plant
  remove_reason_code: string | null;
  ticket_products?: TicketProduct[];
}

export interface TicketProduct {
  ticket_id: number;
  is_mix: boolean;
  load_qty: number | null;
}

/**
 * Internal truck state for calculations
 */
export interface TruckState {
  ticketId: number;
  truckCode: string;
  loadedTime: string | null;
  loadTime: string | null;
  onJobTime: string;
  unloadTime: string | null;
  washTime: string | null;
  toPlantTime: string | null;
  loadQty: number;
}

// ============================================================================
// POUR SPEED DATA TYPES
// ============================================================================

export interface PourSpeedDataPoint {
  time: string;
  time_display: string;
  rate: number;
  cumulative_qty?: number;
  load_qty?: number;
  actual_spacing_min?: number;
}

export interface PourSpeedGraphData {
  schedule_rate: number;
  y_max: number;
  scheduled_qty: number;
  truck_space: number;
  ordered: PourSpeedDataPoint[];
  delivered: PourSpeedDataPoint[];
  poured: PourSpeedDataPoint[];
}

// ============================================================================
// TRUCKS ON JOB DATA TYPES
// ============================================================================

export interface TrucksOnJobTimePoint {
  time: string;
  time_display: string;
  waiting: number;
  pouring: number;
  washout: number;
  total: number;
  avg_waiting_time?: number | null;
  avg_pouring_time?: number | null;
  avg_washing_time?: number | null;
}

export interface TrucksOnJobAverages {
  avg_waiting_minutes: number;
  avg_pouring_minutes: number;
  avg_washout_minutes: number;
}

export interface TrucksOnJobGraphData {
  time_points: TrucksOnJobTimePoint[];
  averages: TrucksOnJobAverages;
}

// ============================================================================
// UNIFIED DATA POINT (for merged data)
// ============================================================================

export interface PerformanceDataPoint {
  time: string;
  timestamp: number;
  ordered_truck_qty: number | null;
  poured_truck_qty: number | null;
  delivered_truck_qty: number | null;
  delivered_load_qty: number | null;
  delivered_actual_spacing: number | null;
  waiting: number;
  pouring: number;
  washout: number;
  avgWaitingTime: number | null;
  avgPouringTime: number | null;
  avgWashingTime: number | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Filter valid tickets (not cancelled, has required data)
 */
export function filterValidTickets(tickets: TicketData[]): TicketData[] {
  return tickets.filter(ticket =>
    !ticket.remove_reason_code || ticket.remove_reason_code === ''
  );
}

/**
 * Get load quantity from ticket products (mix product)
 */
export function getTicketLoadQty(ticket: TicketData): number {
  if (!ticket.ticket_products) return 0;
  const mixProduct = ticket.ticket_products.find(p => p.is_mix === true);
  return mixProduct?.load_qty || 0;
}

/**
 * Format time to HH:MM display
 */
export function formatTimeDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Round Y-axis max to "nice" value
 */
export function roundToNiceValue(value: number): number {
  if (value <= 25) return 25;
  if (value <= 50) return 50;
  if (value <= 75) return 75;
  if (value <= 100) return 100;
  if (value <= 150) return 150;
  if (value <= 200) return 200;
  return Math.ceil(value / 50) * 50;
}

/**
 * Get Y-axis tick values based on max
 */
export function getYAxisTicks(max: number): number[] {
  if (max <= 50) return [0, 25, 50];
  if (max <= 100) return [0, 50, 100];
  if (max <= 150) return [0, 50, 100, 150];
  if (max <= 200) return [0, 50, 100, 150, 200];
  return [0, Math.round(max / 2), max];
}

// ============================================================================
// POUR SPEED CHART CALCULATIONS
// ============================================================================

/**
 * Generate Ordered line data points
 * Shows PLANNED/SCHEDULED delivery timeline (constant Y-value)
 */
export function calculateOrderedData(schedule: OrderProductSchedule): PourSpeedDataPoint[] {
  if (!schedule.start_time || !schedule.number_of_loads || !schedule.truck_space) {
    return [];
  }

  const points: PourSpeedDataPoint[] = [];
  const startTime = new Date(schedule.start_time).getTime();
  const truckSpaceMs = (schedule.truck_space || 0) * 60 * 1000; // Convert minutes to ms
  const rate = Number(schedule.delivery_rate_per_hour) || 0;

  for (let i = 0; i < schedule.number_of_loads; i++) {
    const pointTime = new Date(startTime + (i * truckSpaceMs));
    points.push({
      time: pointTime.toISOString(),
      time_display: formatTimeDisplay(pointTime.toISOString()),
      rate: rate,
      cumulative_qty: schedule.load_qty * (i + 1),
    });
  }

  return points;
}

/**
 * Generate Delivered line data points
 * Shows cumulative delivery rate based on actual truck arrivals (on_job_time)
 * Formula: rate = MIN(cumulative_qty / hours_since_1st_delivery, schedule_rate * 1.5)
 */
export function calculateDeliveredData(
  tickets: TicketData[],
  scheduleRate: number
): PourSpeedDataPoint[] {
  // Filter tickets with on_job_time
  const validTickets = filterValidTickets(tickets)
    .filter(t => t.on_job_time)
    .sort((a, b) => new Date(a.on_job_time!).getTime() - new Date(b.on_job_time!).getTime());

  if (validTickets.length === 0) return [];

  const points: PourSpeedDataPoint[] = [];
  const firstDeliveryTime = new Date(validTickets[0].on_job_time!).getTime();
  const maxRateCap = scheduleRate * 1.5;
  let cumulativeQty = 0;
  let previousTime: number | null = null;

  for (let i = 0; i < validTickets.length; i++) {
    const ticket = validTickets[i];
    const loadQty = getTicketLoadQty(ticket);
    cumulativeQty += loadQty;

    const onJobTime = new Date(ticket.on_job_time!).getTime();
    let rate: number;

    if (i === 0) {
      // First truck: use schedule rate (can't calculate with 0 elapsed time)
      rate = scheduleRate;
    } else {
      const elapsedHours = (onJobTime - firstDeliveryTime) / 3600000;
      if (elapsedHours > 0) {
        const actualRate = cumulativeQty / elapsedHours;
        rate = Math.min(actualRate, maxRateCap); // Cap at 1.5x schedule rate
      } else {
        rate = scheduleRate;
      }
    }

    // Calculate actual spacing from previous truck
    let actualSpacingMin: number | undefined;
    if (previousTime !== null) {
      actualSpacingMin = (onJobTime - previousTime) / 60000; // minutes
    }
    previousTime = onJobTime;

    points.push({
      time: ticket.on_job_time!,
      time_display: formatTimeDisplay(ticket.on_job_time!),
      rate: Math.round(rate * 100) / 100, // Round to 2 decimal places
      cumulative_qty: cumulativeQty,
      load_qty: loadQty,
      actual_spacing_min: actualSpacingMin,
    });
  }

  return points;
}

/**
 * Generate Poured line data points
 * Shows cumulative pour rate based on actual pour completion times
 * Uses wash_time (priority) or unload_time (fallback) for X-axis
 * Formula: rate = MIN(cumulative_qty / hours_since_1st_delivery, schedule_rate * 1.5)
 */
export function calculatePouredData(
  tickets: TicketData[],
  scheduleRate: number,
  firstDeliveryTime?: number
): PourSpeedDataPoint[] {
  // Filter tickets with pour time (wash_time or unload_time)
  const validTickets = filterValidTickets(tickets)
    .filter(t => t.wash_time || t.unload_time)
    .map(t => ({
      ...t,
      pour_time: t.wash_time || t.unload_time,
    }))
    .sort((a, b) => new Date(a.pour_time!).getTime() - new Date(b.pour_time!).getTime());

  if (validTickets.length === 0) return [];

  // If firstDeliveryTime not provided, calculate from all tickets with on_job_time
  if (!firstDeliveryTime) {
    const ticketsWithOnJob = filterValidTickets(tickets)
      .filter(t => t.on_job_time)
      .sort((a, b) => new Date(a.on_job_time!).getTime() - new Date(b.on_job_time!).getTime());

    if (ticketsWithOnJob.length > 0) {
      firstDeliveryTime = new Date(ticketsWithOnJob[0].on_job_time!).getTime();
    } else {
      firstDeliveryTime = new Date(validTickets[0].pour_time!).getTime();
    }
  }

  const points: PourSpeedDataPoint[] = [];
  const maxRateCap = scheduleRate * 1.5;
  let cumulativeQty = 0;

  for (const ticket of validTickets) {
    const loadQty = getTicketLoadQty(ticket);
    cumulativeQty += loadQty;

    const pourTime = new Date(ticket.pour_time!).getTime();
    const elapsedHours = (pourTime - firstDeliveryTime) / 3600000;

    let rate: number;
    if (elapsedHours > 0) {
      const actualRate = cumulativeQty / elapsedHours;
      rate = Math.min(actualRate, maxRateCap);
    } else {
      rate = scheduleRate; // Edge case: pour before 1st delivery
    }

    points.push({
      time: ticket.pour_time!,
      time_display: formatTimeDisplay(ticket.pour_time!),
      rate: Math.round(rate * 100) / 100,
      cumulative_qty: cumulativeQty,
      load_qty: loadQty,
    });
  }

  return points;
}

/**
 * Calculate Y-axis max for Pour Speed chart
 */
export function calculatePourSpeedYMax(
  orderedData: PourSpeedDataPoint[],
  deliveredData: PourSpeedDataPoint[],
  pouredData: PourSpeedDataPoint[],
  scheduleRate: number
): number {
  const allRates = [
    ...orderedData.map(d => d.rate),
    ...deliveredData.map(d => d.rate),
    ...pouredData.map(d => d.rate),
  ].filter(r => r != null);

  if (allRates.length === 0) {
    return roundToNiceValue(scheduleRate);
  }

  const maxDataValue = Math.max(...allRates);

  // Outlier detection: if max > 10x schedule rate, cap at 5x
  let yMax: number;
  if (maxDataValue > scheduleRate * 10) {
    yMax = roundToNiceValue(scheduleRate * 5);
  } else {
    yMax = roundToNiceValue(maxDataValue);
  }

  // Ensure yMax >= schedule rate
  if (yMax < roundToNiceValue(scheduleRate)) {
    yMax = roundToNiceValue(scheduleRate);
  }

  return yMax;
}

/**
 * Generate complete Pour Speed graph data
 */
export function calculatePourSpeedGraph(
  schedule: OrderProductSchedule,
  tickets: TicketData[]
): PourSpeedGraphData {
  const scheduleRate = Number(schedule.delivery_rate_per_hour) || 0;

  const orderedData = calculateOrderedData(schedule);
  const deliveredData = calculateDeliveredData(tickets, scheduleRate);
  const pouredData = calculatePouredData(tickets, scheduleRate);

  const yMax = calculatePourSpeedYMax(orderedData, deliveredData, pouredData, scheduleRate);

  return {
    schedule_rate: scheduleRate,
    y_max: yMax,
    scheduled_qty: schedule.schedule_qty || 0,
    truck_space: schedule.truck_space || 0,
    ordered: orderedData,
    delivered: deliveredData,
    poured: pouredData,
  };
}

// ============================================================================
// TRUCKS ON JOB CHART CALCULATIONS
// ============================================================================

/**
 * Process tickets into TruckState objects for tracking
 */
export function processTruckStates(tickets: TicketData[]): TruckState[] {
  const now = new Date().toISOString();

  return filterValidTickets(tickets)
    .filter(t => t.truck_code) // Exclude tickets without truck_code
    .map(ticket => {
      // onJobTime fallback chain: on_job_time -> loaded_time -> printed_time -> now
      const onJobTime = ticket.on_job_time || ticket.loaded_time || ticket.printed_time || now;

      // toPlantTime fallback to current time if not set
      let toPlantTime = ticket.to_plant_time || now;

      // Safety: ensure toPlantTime >= onJobTime
      if (new Date(toPlantTime).getTime() < new Date(onJobTime).getTime()) {
        toPlantTime = onJobTime;
      }

      return {
        ticketId: ticket.ticket_id,
        truckCode: ticket.truck_code!,
        loadedTime: ticket.loaded_time,
        loadTime: ticket.load_time,
        onJobTime,
        unloadTime: ticket.unload_time,
        washTime: ticket.wash_time,
        toPlantTime,
        loadQty: getTicketLoadQty(ticket),
      };
    });
}

/**
 * Determine truck state at a specific time
 * Returns: 'waiting' | 'pouring' | 'washout' | null (not on job)
 */
export function getTruckStateAtTime(
  truck: TruckState,
  time: number
): 'waiting' | 'pouring' | 'washout' | null {
  const onJobTime = new Date(truck.onJobTime).getTime();
  const toPlantTime = truck.toPlantTime ? new Date(truck.toPlantTime).getTime() : null;

  // Skip if truck not on job at this time
  if (time < onJobTime || (toPlantTime && time > toPlantTime)) {
    return null;
  }

  // Has unload time?
  if (truck.unloadTime) {
    const unloadTime = new Date(truck.unloadTime).getTime();

    if (time < unloadTime) {
      return 'waiting'; // Before pour starts
    }

    // Has wash time?
    if (truck.washTime) {
      const washTime = new Date(truck.washTime).getTime();

      if (time < washTime) {
        return 'pouring'; // Between pour start and wash
      } else {
        // After wash time but still on job
        return 'washout';
      }
    } else {
      // No wash time recorded -> still pouring until leaves
      return 'pouring';
    }
  } else {
    // No unload time -> still waiting
    return 'waiting';
  }
}

/**
 * Calculate truck counts at a specific time point
 */
export function calculateTrucksOnJob(
  time: number,
  truckStates: TruckState[]
): { waiting: number; pouring: number; washout: number } {
  let waiting = 0;
  let pouring = 0;
  let washout = 0;

  for (const truck of truckStates) {
    const state = getTruckStateAtTime(truck, time);
    switch (state) {
      case 'waiting':
        waiting++;
        break;
      case 'pouring':
        pouring++;
        break;
      case 'washout':
        washout++;
        break;
    }
  }

  return { waiting, pouring, washout };
}

/**
 * Calculate average time durations at a specific time point
 */
export function calculateAverageTimeDurations(
  time: number,
  truckStates: TruckState[]
): { avgWaitingTime: number | null; avgPouringTime: number | null; avgWashingTime: number | null } {
  const waitingTimes: number[] = [];
  const pouringTimes: number[] = [];
  const washingTimes: number[] = [];

  for (const truck of truckStates) {
    const state = getTruckStateAtTime(truck, time);
    if (!state) continue;

    if (state === 'waiting' && truck.unloadTime) {
      // Waiting duration = unload_time - on_job_time
      const duration = (new Date(truck.unloadTime).getTime() - new Date(truck.onJobTime).getTime()) / 60000;
      if (duration > 0) waitingTimes.push(duration);
    }

    if (state === 'pouring' && truck.unloadTime && truck.washTime) {
      // Pouring duration = wash_time - unload_time
      const duration = (new Date(truck.washTime).getTime() - new Date(truck.unloadTime).getTime()) / 60000;
      if (duration > 0) pouringTimes.push(duration);
    }

    if (state === 'washout' && truck.washTime && truck.toPlantTime) {
      // Washing duration = to_plant_time - wash_time
      const duration = (new Date(truck.toPlantTime).getTime() - new Date(truck.washTime).getTime()) / 60000;
      if (duration > 0) washingTimes.push(duration);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  return {
    avgWaitingTime: avg(waitingTimes),
    avgPouringTime: avg(pouringTimes),
    avgWashingTime: avg(washingTimes),
  };
}

/**
 * Calculate overall averages across all completed trucks
 */
export function calculateOverallAverages(truckStates: TruckState[]): TrucksOnJobAverages {
  const waitingTimes: number[] = [];
  const pouringTimes: number[] = [];
  const washingTimes: number[] = [];

  for (const truck of truckStates) {
    // Waiting time (if truck has moved past waiting)
    if (truck.unloadTime) {
      const waiting = (new Date(truck.unloadTime).getTime() - new Date(truck.onJobTime).getTime()) / 60000;
      if (waiting > 0) waitingTimes.push(waiting);
    }

    // Pouring time (if truck has completed pouring)
    if (truck.unloadTime && truck.washTime) {
      const pouring = (new Date(truck.washTime).getTime() - new Date(truck.unloadTime).getTime()) / 60000;
      if (pouring > 0) pouringTimes.push(pouring);
    }

    // Washout time (if truck has left job)
    if (truck.washTime && truck.toPlantTime && truck.toPlantTime !== truck.washTime) {
      const washout = (new Date(truck.toPlantTime).getTime() - new Date(truck.washTime).getTime()) / 60000;
      if (washout > 0) washingTimes.push(washout);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    avg_waiting_minutes: Math.round(avg(waitingTimes) * 10) / 10,
    avg_pouring_minutes: Math.round(avg(pouringTimes) * 10) / 10,
    avg_washout_minutes: Math.round(avg(washingTimes) * 10) / 10,
  };
}

/**
 * Calculate time range for charts
 */
export function calculateTimeRange(
  schedule: OrderProductSchedule | null,
  tickets: TicketData[]
): { minTime: number; maxTime: number } {
  const now = Date.now();
  const validTickets = filterValidTickets(tickets);

  // Start time: earliest of schedule start or first delivery
  let chartStartTime = schedule?.start_time
    ? new Date(schedule.start_time).getTime()
    : now;

  // Check for early deliveries
  const ticketsWithOnJob = validTickets.filter(t => t.on_job_time);
  if (ticketsWithOnJob.length > 0) {
    const earliestDelivery = Math.min(
      ...ticketsWithOnJob.map(t => new Date(t.on_job_time!).getTime())
    );
    if (earliestDelivery < chartStartTime) {
      chartStartTime = earliestDelivery;
    }
  }

  // End time calculation
  let endTime = now;

  // Check last at_plant_time
  const ticketsWithAtPlant = validTickets.filter(t => t.at_plant_time);
  if (ticketsWithAtPlant.length > 0) {
    const lastAtPlantTime = Math.max(
      ...ticketsWithAtPlant.map(t => new Date(t.at_plant_time!).getTime())
    );
    if (lastAtPlantTime > now) {
      endTime = lastAtPlantTime;
    } else if (lastAtPlantTime > endTime) {
      endTime = lastAtPlantTime;
    }
  }

  // Safety: ensure end > start
  if (endTime <= chartStartTime) {
    endTime = chartStartTime + 3600000; // Add 1 hour
  }

  return { minTime: chartStartTime, maxTime: endTime };
}

/**
 * Generate time points at regular intervals
 */
export function generateTimeIntervals(
  minTime: number,
  maxTime: number,
  intervalMinutes: number = 5
): number[] {
  const times: number[] = [];
  const intervalMs = intervalMinutes * 60 * 1000;

  // Round start to interval boundary
  const start = Math.floor(minTime / intervalMs) * intervalMs;

  for (let time = start; time <= maxTime; time += intervalMs) {
    times.push(time);
  }

  return times;
}

/**
 * Generate complete Trucks on Job graph data
 */
export function calculateTrucksOnJobGraph(
  schedule: OrderProductSchedule | null,
  tickets: TicketData[]
): TrucksOnJobGraphData {
  const truckStates = processTruckStates(tickets);

  if (truckStates.length === 0) {
    return {
      time_points: [],
      averages: {
        avg_waiting_minutes: 0,
        avg_pouring_minutes: 0,
        avg_washout_minutes: 0,
      },
    };
  }

  const { minTime, maxTime } = calculateTimeRange(schedule, tickets);
  const timeIntervals = generateTimeIntervals(minTime, maxTime, 5); // 5-minute intervals

  const timePoints: TrucksOnJobTimePoint[] = timeIntervals.map(time => {
    const counts = calculateTrucksOnJob(time, truckStates);
    const avgDurations = calculateAverageTimeDurations(time, truckStates);

    return {
      time: new Date(time).toISOString(),
      time_display: formatTimeDisplay(new Date(time).toISOString()),
      waiting: counts.waiting,
      pouring: counts.pouring,
      washout: counts.washout,
      total: counts.waiting + counts.pouring + counts.washout,
      avg_waiting_time: avgDurations.avgWaitingTime,
      avg_pouring_time: avgDurations.avgPouringTime,
      avg_washing_time: avgDurations.avgWashingTime,
    };
  });

  const averages = calculateOverallAverages(truckStates);

  return {
    time_points: timePoints,
    averages,
  };
}

// ============================================================================
// UNIFIED DATA PIPELINE
// ============================================================================

/**
 * Generate unified chart data combining Pour Speed and Trucks on Job
 */
export function generateUnifiedChartData(
  schedule: OrderProductSchedule | null,
  tickets: TicketData[]
): PerformanceDataPoint[] {
  const scheduleRate = schedule ? Number(schedule.delivery_rate_per_hour) || 0 : 0;

  // Calculate all data sets
  const orderedData = schedule ? calculateOrderedData(schedule) : [];
  const deliveredData = calculateDeliveredData(tickets, scheduleRate);
  const pouredData = calculatePouredData(tickets, scheduleRate);
  const truckStates = processTruckStates(tickets);

  // Collect all event times
  const eventTimes = new Set<number>();

  // Add scheduled order points
  orderedData.forEach(d => eventTimes.add(new Date(d.time).getTime()));

  // Add delivered points
  deliveredData.forEach(d => eventTimes.add(new Date(d.time).getTime()));

  // Add poured points
  pouredData.forEach(d => eventTimes.add(new Date(d.time).getTime()));

  // Calculate time range and add regular intervals
  const { minTime, maxTime } = calculateTimeRange(schedule, tickets);
  eventTimes.add(minTime);
  eventTimes.add(maxTime);

  // Add 5-minute intervals for smooth visualization
  const intervals = generateTimeIntervals(minTime, maxTime, 5);
  intervals.forEach(t => eventTimes.add(t));

  // Sort times
  const sortedTimes = Array.from(eventTimes).sort((a, b) => a - b);

  // Generate unified data points
  const chartData: PerformanceDataPoint[] = sortedTimes.map(time => {
    const timeStr = new Date(time).toISOString();

    // Look up Pour Speed values (null if no event at this exact time)
    const orderedPoint = orderedData.find(d => new Date(d.time).getTime() === time);
    const deliveredPoint = deliveredData.find(d => new Date(d.time).getTime() === time);
    const pouredPoint = pouredData.find(d => new Date(d.time).getTime() === time);

    // Calculate truck states (continuous values)
    const truckCounts = calculateTrucksOnJob(time, truckStates);
    const avgDurations = calculateAverageTimeDurations(time, truckStates);

    return {
      time: timeStr,
      timestamp: time,
      ordered_truck_qty: orderedPoint?.rate ?? null,
      poured_truck_qty: pouredPoint?.rate ?? null,
      delivered_truck_qty: deliveredPoint?.rate ?? null,
      delivered_load_qty: deliveredPoint?.load_qty ?? null,
      delivered_actual_spacing: deliveredPoint?.actual_spacing_min ?? null,
      waiting: truckCounts.waiting,
      pouring: truckCounts.pouring,
      washout: truckCounts.washout,
      avgWaitingTime: avgDurations.avgWaitingTime,
      avgPouringTime: avgDurations.avgPouringTime,
      avgWashingTime: avgDurations.avgWashingTime,
    };
  });

  return chartData;
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export default {
  // Helpers
  filterValidTickets,
  getTicketLoadQty,
  formatTimeDisplay,
  roundToNiceValue,
  getYAxisTicks,

  // Pour Speed
  calculateOrderedData,
  calculateDeliveredData,
  calculatePouredData,
  calculatePourSpeedYMax,
  calculatePourSpeedGraph,

  // Trucks on Job
  processTruckStates,
  getTruckStateAtTime,
  calculateTrucksOnJob,
  calculateAverageTimeDurations,
  calculateOverallAverages,
  calculateTimeRange,
  generateTimeIntervals,
  calculateTrucksOnJobGraph,

  // Unified
  generateUnifiedChartData,
};
