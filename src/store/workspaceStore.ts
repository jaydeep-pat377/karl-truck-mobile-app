import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

const WORKSPACE_STORAGE_KEY = '@truckast_active_workspace';

export interface Workspace {
  id: string;
  name: string;
  subdomain: string;
  accent: string;
  status: 'active' | 'inactive';
}

const PALETTE = [
  colors.primary.main,
  colors.secondary.main,
  colors.accent.indigo,
  colors.warning.main,
  colors.info.main,
  '#8B5CF6',
];

const getAccent = (index: number) => PALETTE[index % PALETTE.length];

export const DEFAULT_WORKSPACES: Workspace[] = [
  { id: 'concrete-supply', name: 'Concrete Supply', subdomain: 'concrete-supply.truckast.ai', accent: getAccent(0), status: 'active' },
  { id: 'delta-industries', name: 'Delta Industries', subdomain: 'delta.truckast.ai', accent: getAccent(1), status: 'active' },
  { id: 'dolese-ready-mix', name: 'Dolese Ready Mix', subdomain: 'dolese.truckast.ai', accent: getAccent(2), status: 'active' },
  { id: 'hercules', name: 'Hercules', subdomain: 'hercules.truckast.ai', accent: getAccent(3), status: 'active' },
  { id: 'stevenson-weir', name: 'StevensonWeir', subdomain: 'stevensonweir.truckast.ai', accent: getAccent(4), status: 'active' },
  { id: 'sunrise', name: 'Sunrise', subdomain: 'sunrise.truckast.ai', accent: getAccent(5), status: 'inactive' },
];

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspaceId: string;
  hydrated: boolean;
}

interface WorkspaceActions {
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (id: string) => Promise<void>;
  hydrate: () => Promise<void>;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: DEFAULT_WORKSPACES,
  currentWorkspaceId: DEFAULT_WORKSPACES[2].id,
  hydrated: false,

  setWorkspaces: (workspaces) => set({ workspaces }),

  setCurrentWorkspace: async (id) => {
    set({ currentWorkspaceId: id });
    try {
      await AsyncStorage.setItem(WORKSPACE_STORAGE_KEY, id);
    } catch (err) {
      console.warn('[workspaceStore] failed to persist workspace:', err);
    }
  },

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const stored = await AsyncStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (stored && get().workspaces.some((w) => w.id === stored)) {
        set({ currentWorkspaceId: stored });
      }
    } catch (err) {
      console.warn('[workspaceStore] hydrate failed:', err);
    } finally {
      set({ hydrated: true });
    }
  },
}));

export const getWorkspaceInitial = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
