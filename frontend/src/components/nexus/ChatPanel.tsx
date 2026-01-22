import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useUserStore } from '../../stores/userStore';

export const ChatPanel = () => {
  const [message, setMessage] = useState('');
  const messages = useSessionStore((state) => state.chatMessages);
  const members = useSessionStore((state) => state.members);
  const addChatMessage = useSessionStore((state) => state.addChatMessage);
  const user = useUserStore((state) => state.user);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const typingMembers = members.filter((m) => m.isTyping && m.id !== user?.id);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !user) return;

    addChatMessage({
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      avatar: user.avatar,
      message: message.trim(),
      timestamp: new Date(),
    });

    setMessage('');
  };

  return (
    <div className="bg-dark-surface rounded-lg border border-gray-800 p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-collab-500" />
        <h3 className="font-semibold text-white">Chat ({messages.length})</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex gap-3 ${
                msg.userId === user?.id ? 'flex-row-reverse' : ''
              }`}
            >
              {msg.userId !== user?.id && (
                <div className="flex-shrink-0">
                  {msg.avatar ? (
                    <img
                      src={msg.avatar}
                      alt={msg.userName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-collab flex items-center justify-center text-white text-xs font-semibold">
                      {msg.userName[0].toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              <div
                className={`flex flex-col ${
                  msg.userId === user?.id ? 'items-end' : 'items-start'
                }`}
              >
                <div className="text-xs text-gray-400 mb-1">{msg.userName}</div>
                <div
                  className={`px-3 py-2 rounded-lg max-w-[80%] ${
                    msg.userId === user?.id
                      ? 'bg-gradient-collab text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  {msg.message}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {typingMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-gray-400 italic"
          >
            {typingMembers.map((m) => m.name).join(', ')} typing...
            <span className="inline-flex gap-1 ml-2">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                .
              </motion.span>
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              >
                .
              </motion.span>
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              >
                .
              </motion.span>
            </span>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-collab-500"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          className="px-4 py-2 bg-gradient-collab text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
};

