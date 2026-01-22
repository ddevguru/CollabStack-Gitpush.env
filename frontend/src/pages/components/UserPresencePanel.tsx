import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, Code, Edit } from 'lucide-react';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { CURSOR_COLORS } from '@/stores/sessionStore';

interface UserPresence {
  userId: string;
  userName: string;
  filePath: string;
  line: number;
  column: number;
  action: 'typing' | 'viewing' | 'editing';
  lastSeen: Date;
}

interface UserPresencePanelProps {
  projectId: string;
  roomId: string;
}

export default function UserPresencePanel({ projectId, roomId }: UserPresencePanelProps) {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<UserPresence[]>([]);
  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    const handleCursorUpdate = (data: any) => {
      if (data.userId === user?.id) return;

      setUsers((prev) => {
        const existing = prev.find((u) => u.userId === data.userId);
        const updated: UserPresence = {
          userId: data.userId,
          userName: data.userName || 'Unknown',
          filePath: data.filePath || 'Unknown',
          line: data.position?.line || 0,
          column: data.position?.column || 0,
          action: 'editing',
          lastSeen: new Date(),
        };

        if (existing) {
          return prev.map((u) => (u.userId === data.userId ? updated : u));
        } else {
          return [...prev, updated];
        }
      });
    };

    const handleFileOpened = (data: any) => {
      if (data.userId === user?.id) return;

      setUsers((prev) => {
        const existing = prev.find((u) => u.userId === data.userId);
        const updated: UserPresence = {
          userId: data.userId,
          userName: data.userName || 'Unknown',
          filePath: data.filePath || 'Unknown',
          line: 0,
          column: 0,
          action: 'viewing',
          lastSeen: new Date(),
        };

        if (existing) {
          return prev.map((u) => (u.userId === data.userId ? updated : u));
        } else {
          return [...prev, updated];
        }
      });
    };

    const handleUserLeft = (data: any) => {
      setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    const handleRoomUsers = (data: { users: any[] }) => {
      const presenceUsers: UserPresence[] = data.users
        .filter((u) => u.userId !== user?.id)
        .map((u) => ({
          userId: u.userId,
          userName: u.userName || u.name || 'Unknown',
          filePath: u.activeFile || 'No file',
          line: u.cursorPos?.line || 0,
          column: u.cursorPos?.column || 0,
          action: u.cursorPos ? 'editing' : 'viewing',
          lastSeen: new Date(u.lastActive || Date.now()),
        }));
      setUsers(presenceUsers);
    };

    socket.on('cursor:updated', handleCursorUpdate);
    socket.on('file:opened', handleFileOpened);
    socket.on('user:left', handleUserLeft);
    socket.on('room:users', handleRoomUsers);

    // Request current users
    socket.emit('room:join', { projectId, roomId });

    return () => {
      socket.off('cursor:updated', handleCursorUpdate);
      socket.off('file:opened', handleFileOpened);
      socket.off('user:left', handleUserLeft);
      socket.off('room:users', handleRoomUsers);
    };
  }, [socket, projectId, roomId, user]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'typing':
      case 'editing':
        return <Edit className="w-3 h-3" />;
      case 'viewing':
        return <FileText className="w-3 h-3" />;
      default:
        return <Code className="w-3 h-3" />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'typing':
      case 'editing':
        return 'Editing';
      case 'viewing':
        return 'Viewing';
      default:
        return 'Active';
    }
  };

  if (users.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <p>No other users active</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center gap-2 px-2 mb-2">
        <Users className="w-4 h-4 text-collab-400" />
        <span className="text-sm font-semibold text-white">Active Users</span>
        <span className="text-xs text-gray-400">({users.length})</span>
      </div>
      {users.map((presence) => {
        const color = CURSOR_COLORS[presence.userId.charCodeAt(0) % CURSOR_COLORS.length];
        const fileName = presence.filePath.split('/').pop() || presence.filePath;

        return (
          <motion.div
            key={presence.userId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white truncate">
                    {presence.userName}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    {getActionIcon(presence.action)}
                    <span>{getActionText(presence.action)}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 truncate mb-1" title={presence.filePath}>
                  <FileText className="w-3 h-3 inline mr-1" />
                  {fileName}
                </div>
                {presence.line > 0 && (
                  <div className="text-xs text-gray-500">
                    Line {presence.line}, Column {presence.column}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

