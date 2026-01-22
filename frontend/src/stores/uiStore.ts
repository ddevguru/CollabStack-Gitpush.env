import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timestamp: Date;
}

interface UIState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  notifications: Notification[];
  layout: 'split' | 'editor' | 'collab';
  showSettings: boolean;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  setLayout: (layout: 'split' | 'editor' | 'collab') => void;
  setShowSettings: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  sidebarOpen: true,
  notifications: [],
  layout: 'split',
  showSettings: false,
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: Date.now().toString(),
          timestamp: new Date(),
        },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  setLayout: (layout) => set({ layout }),
  setShowSettings: (show) => set({ showSettings: show }),
}));

