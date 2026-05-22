import { PG } from './theme';
import type { StageKey, StatusCategory, SubStatusCode } from './types';

export const STAGE_ORDER: StageKey[] = [
  'loading',
  'to_job',
  'at_job',
  'pouring',
  'poured',
  'washing',
  'to_plant',
  'at_plant',
];

export const STAGE_LABEL: Record<StageKey, string> = {
  loading: 'Loading',
  to_job: 'To Job',
  at_job: 'At Job',
  pouring: 'Pouring',
  poured: 'Poured',
  washing: 'Washing',
  to_plant: 'To Plant',
  at_plant: 'At Plant',
};

export const SUB_STATUS_LABEL: Record<SubStatusCode, string> = {
  0: 'Normal',
  1: 'Will Call',
  2: 'Weather Permitting',
  3: 'Hold',
  5: 'Wait List',
};

interface StatusMeta {
  pillBg: string;
  pillColor: string;
  rail: string;
  dot: string;
  label: string;
}

export function statusMeta(
  category: StatusCategory,
  sub: SubStatusCode | null,
): StatusMeta {
  switch (category) {
    case 'IN_PROCESS':
      return {
        pillBg: PG.procTint,
        pillColor: PG.proc,
        rail: PG.proc,
        dot: PG.proc,
        label: 'In-Process',
      };
    case 'COMPLETED':
      return {
        pillBg: PG.doneTint,
        pillColor: PG.done,
        rail: PG.done,
        dot: PG.done,
        label: 'Completed',
      };
    case 'CANCELED':
      return {
        pillBg: PG.cancelTint,
        pillColor: PG.ink2,
        rail: PG.cancel,
        dot: PG.cancel,
        label: 'Canceled',
      };
    case 'PRE_POUR':
      return {
        pillBg: PG.preTint,
        pillColor: PG.pre,
        rail: PG.pre,
        dot: PG.pre,
        label: sub != null ? SUB_STATUS_LABEL[sub] : 'Pre-Pour',
      };
  }
}

export const STATUS_FILTER_COUNTS = {
  all: 207,
  prePour: 201,
  inProcess: 3,
  completed: 1,
  canceled: 82,
  attention: 5,
} as const;
