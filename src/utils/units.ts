import { useAuthStore } from '../store/authStore';

/**
 * Tenant volume unit (e.g. 'CY' for US tenants, 'm³' for metric tenants like CBM).
 * Sourced from the backend (app-permissions / profile / dashboard) into authStore.
 * Stable after login, so a plain getter is fine for display strings.
 */
export const getVolumeUnit = (): string => useAuthStore.getState().volumeUnit || 'CY';

/** Reactive hook variant for components that should re-render on change. */
export const useVolumeUnit = (): string =>
  useAuthStore((s) => s.volumeUnit) || 'CY';
