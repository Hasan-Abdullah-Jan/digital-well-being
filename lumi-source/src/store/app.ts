import { create } from 'zustand';

import type { StaffRoles } from '@/services/community/types';
import { playSound } from '@/services/sound';

/** Runtime-only state (never saved). */
export type Celebration = {
  id: string;
  kind: 'badge' | 'message';
  badgeId?: string;
  title: string;
  body: string;
};

type AppState = {
  ready: boolean;
  demoMode: boolean;
  locked: boolean;
  celebrations: Celebration[];
  support: { visible: boolean; source?: string };
  staff: StaffRoles | null;
  toast: { id: number; message: string } | null;
  setReady: (ready: boolean) => void;
  setDemoMode: (demo: boolean) => void;
  setLocked: (locked: boolean) => void;
  celebrate: (c: Omit<Celebration, 'id'>) => void;
  dismissCelebration: () => void;
  showSupport: (source?: string) => void;
  hideSupport: () => void;
  setStaff: (roles: StaffRoles | null) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
};

let celebrationCounter = 0;

export const useApp = create<AppState>()((set) => ({
  ready: false,
  demoMode: false,
  locked: false,
  celebrations: [],
  support: { visible: false },
  staff: null,
  toast: null,
  setReady: (ready) => set({ ready }),
  setDemoMode: (demoMode) => set({ demoMode }),
  setLocked: (locked) => set({ locked }),
  celebrate: (c) =>
    set((s) => ({ celebrations: [...s.celebrations, { ...c, id: `c${++celebrationCounter}` }] })),
  dismissCelebration: () => set((s) => ({ celebrations: s.celebrations.slice(1) })),
  showSupport: (source) => set({ support: { visible: true, source } }),
  hideSupport: () => set({ support: { visible: false } }),
  setStaff: (staff) => set({ staff }),
  showToast: (message) => {
    playSound('success');
    set({ toast: { id: Date.now(), message } });
  },
  clearToast: () => set({ toast: null }),
}));
