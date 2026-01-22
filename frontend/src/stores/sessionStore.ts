import { create } from 'zustand';

interface Cursor {
  userId: string;
  userName: string;
  color: string;
  position: { line: number; column: number };
  fileId: string;
}

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  isTyping: boolean;
  role: 'leader' | 'member';
  contribution: number; // percentage
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  avatar?: string;
  message: string;
  timestamp: Date;
}

interface SessionState {
  cursors: Cursor[];
  members: TeamMember[];
  chatMessages: ChatMessage[];
  isConnected: boolean;
  addCursor: (cursor: Cursor) => void;
  removeCursor: (userId: string) => void;
  updateCursor: (userId: string, position: { line: number; column: number }) => void;
  setMembers: (members: TeamMember[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  setTyping: (userId: string, isTyping: boolean) => void;
  setConnected: (connected: boolean) => void;
}

const CURSOR_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b'];

export const useSessionStore = create<SessionState>((set) => ({
  cursors: [],
  members: [],
  chatMessages: [],
  isConnected: false,
  addCursor: (cursor) =>
    set((state) => ({
      cursors: [...state.cursors.filter((c) => c.userId !== cursor.userId), cursor],
    })),
  removeCursor: (userId) =>
    set((state) => ({
      cursors: state.cursors.filter((c) => c.userId !== userId),
    })),
  updateCursor: (userId, position) =>
    set((state) => ({
      cursors: state.cursors.map((c) =>
        c.userId === userId ? { ...c, position } : c
      ),
    })),
  setMembers: (members) => set({ members }),
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message].slice(-120), // Keep last 120 messages
    })),
  setTyping: (userId, isTyping) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.id === userId ? { ...m, isTyping } : m
      ),
    })),
  setConnected: (connected) => set({ isConnected: connected }),
}));

export { CURSOR_COLORS };

