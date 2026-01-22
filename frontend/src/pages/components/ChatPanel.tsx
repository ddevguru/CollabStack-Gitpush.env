import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { Send } from 'lucide-react';
import api from '@/services/api';

interface ChatPanelProps {
  projectId: string;
  roomId: string;
}

interface Message {
  userId: string;
  userName: string;
  avatar?: string;
  message: string;
  timestamp: string;
}

export default function ChatPanel({ projectId, roomId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();
  const { user } = useAuthStore();

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/chat/projects/${projectId}/history`);
        if (response.data.success && response.data.data.messages) {
          setMessages(response.data.data.messages);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadChatHistory();
    }
  }, [projectId]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data: Message) => {
      setMessages((prev) => [...prev, data]);
    };

    socket.on('chat:message', handleMessage);

    return () => {
      socket.off('chat:message', handleMessage);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !socket) return;

    socket.emit('chat:message', {
      roomId,
      projectId,
      message: input,
    });

    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-surface/95 backdrop-blur-xl">
      <div className="p-4 border-b border-gray-700/50 bg-gray-800/30">
        <h3 className="text-lg font-bold text-white bg-gradient-to-r from-collab-400 to-pink-400 bg-clip-text text-transparent">Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/30">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-collab-400"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.userId === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.userId === user?.id
                  ? 'bg-gradient-to-r from-collab-500 to-pink-500 text-white shadow-lg shadow-collab-500/50'
                  : 'bg-gray-800/50 text-gray-200 border border-gray-700/50'
              }`}
            >
              {msg.userId !== user?.id && (
                <div className="text-xs font-semibold mb-1 text-collab-400">{msg.userName}</div>
              )}
              <div className="text-sm">{msg.message}</div>
              <div className="text-xs opacity-70 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-700/50 rounded-lg bg-gray-800/50 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-collab-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

