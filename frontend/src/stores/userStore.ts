import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  college?: string;
  phone?: string;
  role: 'user' | 'admin';
}

interface Team {
  id: string;
  name: string;
  members: User[];
  role: 'leader' | 'member';
}

interface Integration {
  github: {
    connected: boolean;
    username?: string;
    avatar?: string;
  };
  google: {
    connected: boolean;
    email?: string;
  };
}

interface UserState {
  user: User | null;
  teams: Team[];
  integrations: Integration;
  setUser: (user: User | null) => void;
  setTeams: (teams: Team[]) => void;
  updateIntegration: (type: 'github' | 'google', data: any) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  teams: [],
  integrations: {
    github: { connected: false },
    google: { connected: false },
  },
  setUser: (user) => set({ user }),
  setTeams: (teams) => set({ teams }),
  updateIntegration: (type, data) =>
    set((state) => ({
      integrations: {
        ...state.integrations,
        [type]: { ...state.integrations[type], ...data },
      },
    })),
}));

