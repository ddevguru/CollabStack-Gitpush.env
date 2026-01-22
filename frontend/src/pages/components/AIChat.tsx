import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Sparkles } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface AIChatProps {
  projectId: string;
  onClose?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChat({ projectId, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Load chat history
    loadChatHistory();
  }, [projectId]);

  const loadChatHistory = async () => {
    try {
      const response = await api.get(`/ai/chat/${projectId}/history`);
      if (response.data.success && response.data.data.messages) {
        setMessages(
          response.data.data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
          }))
        );
      }
    } catch (error) {
      // Ignore if no history
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post(`/ai/chat/${projectId}`, {
        message: input,
      });

      if (response.data.success) {
        const assistantMessage: Message = {
          id: response.data.data.messageId,
          role: 'assistant',
          content: response.data.data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to get AI response');
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-surface/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-collab-400" />
          <h3 className="text-lg font-bold text-white">AI Assistant</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Bot className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-center">Ask me anything about your code!</p>
            <p className="text-sm text-gray-500 mt-2">I can help with debugging, explanations, and suggestions.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-collab-500 to-pink-500 text-white'
                    : 'bg-gray-800/50 text-gray-200 border border-gray-700/50'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-collab-400" />
                    <span className="text-xs font-semibold text-collab-400">AI Assistant</span>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800/50 text-gray-200 border border-gray-700/50 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-collab-400 animate-pulse" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask AI about your code..."
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-collab-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

