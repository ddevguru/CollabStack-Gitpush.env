import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { Send, Phone, PhoneOff, Mic, MicOff, Volume2, X, Bot, Share2, MessageCircle } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

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
  type?: 'text' | 'voice_note';
  isCommand?: boolean;
  isAction?: boolean;
  audioData?: string;
  duration?: number;
  gifQuery?: string;
}

export default function ChatPanel({ projectId, roomId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const socket = getSocket();
  const { user } = useAuthStore();
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition for voice commands
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceCommand(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

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

    const handleClear = () => {
      setMessages([]);
    };

    const handleVoiceNote = (data: Message) => {
      setMessages((prev) => [...prev, data]);
    };

    const handleCallOffer = async (data: { fromUserId: string; fromUserName: string; offer: RTCSessionDescriptionInit }) => {
      if (data.fromUserId === user?.id) return;

      try {
        // Create peer connection for this user
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });

        // Get local stream if not already available
        if (!localStreamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;
        }

        localStreamRef.current!.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });

        // Set remote description
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send answer back to caller
        socket.emit('voice:call:answer', {
          roomId,
          answer,
          targetUserId: data.fromUserId,
        });

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('voice:call:ice-candidate', {
              roomId,
              candidate: event.candidate,
              targetUserId: data.fromUserId,
            });
          }
        };

        // Handle remote stream
        pc.ontrack = (event) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(console.error);
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            pc.close();
            peerConnectionsRef.current.delete(data.fromUserId);
            if (peerConnectionsRef.current.size === 0) {
              setIsInCall(false);
            }
          }
        };

        peerConnectionsRef.current.set(data.fromUserId, pc);
        setIsInCall(true);
        setShowVoiceCall(true);
        setActiveUsers((prev) => [...prev.filter((id) => id !== data.fromUserId), data.fromUserId]);
      } catch (error) {
        console.error('Error handling call offer:', error);
        toast.error('Failed to accept call');
      }
    };

    const handleCallAnswer = async (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnectionsRef.current.get(data.fromUserId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    };

    const handleIceCandidate = async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionsRef.current.get(data.fromUserId);
      if (pc && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    };

    const handleCallEnd = (data: { fromUserId: string }) => {
      const pc = peerConnectionsRef.current.get(data.fromUserId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(data.fromUserId);
        setActiveUsers((prev) => prev.filter((id) => id !== data.fromUserId));
        if (peerConnectionsRef.current.size === 0) {
          setIsInCall(false);
          setShowVoiceCall(false);
        }
      }
    };

    const handleRoomUsers = (data: { users: Array<{ userId: string; userName: string }> }) => {
      setActiveUsers(data.users.map((u) => u.userId));
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:clear', handleClear);
    socket.on('voice:note:received', handleVoiceNote);
    socket.on('voice:call:offer', handleCallOffer);
    socket.on('voice:call:answer', handleCallAnswer);
    socket.on('voice:call:ice-candidate', handleIceCandidate);
    socket.on('voice:call:end', handleCallEnd);
    socket.on('room:users', handleRoomUsers);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:clear', handleClear);
      socket.off('voice:note:received', handleVoiceNote);
      socket.off('voice:call:offer', handleCallOffer);
      socket.off('voice:call:answer', handleCallAnswer);
      socket.off('voice:call:ice-candidate', handleIceCandidate);
      socket.off('voice:call:end', handleCallEnd);
      socket.off('room:users', handleRoomUsers);
    };
  }, [socket, roomId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleVoiceCommand = (transcript: string) => {
    const command = transcript.toLowerCase().trim();
    
    // Voice commands
    if (command.includes('clear chat') || command.includes('clear messages')) {
      if (socket) {
        socket.emit('chat:message', {
          roomId,
          projectId,
          message: '/clear',
          type: 'text',
        });
      }
      toast.success('Chat cleared');
    } else if (command.includes('show users') || command.includes('list users')) {
      if (socket) {
        socket.emit('chat:message', {
          roomId,
          projectId,
          message: '/users',
          type: 'text',
        });
      }
    } else if (command.includes('help') || command.includes('commands')) {
      if (socket) {
        socket.emit('chat:message', {
          roomId,
          projectId,
          message: '/help',
          type: 'text',
        });
      }
    } else {
      // Send as regular message
      if (socket) {
        socket.emit('chat:message', {
          roomId,
          projectId,
          message: transcript,
          type: 'text',
        });
      }
    }
  };

  const startVoiceAssistant = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('Listening... Speak now');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast.error('Speech recognition not available');
      }
    }
  };

  const stopVoiceAssistant = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || !socket) return;

    socket.emit('chat:message', {
      roomId,
      projectId,
      message: input,
      type: 'text',
    });

    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      recordingStreamRef.current = stream;

      // Use WebM format for better compatibility
      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result as string;

            if (socket) {
              socket.emit('voice:note:upload', {
                roomId,
                projectId,
                audioData: base64Audio,
                duration: Math.round(duration),
              });
              toast.success('Voice note sent');
            }
          };
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        setRecordingDuration(0);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
      // Update duration every second
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((Date.now() - recordingStartTimeRef.current) / 1000);
      }, 100);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Microphone access denied. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const startVoiceCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      localStreamRef.current = stream;

      // Create peer connections for all active users
      const sessions = await api.get(`/chat/projects/${projectId}/users`).catch(() => ({ data: { users: [] } }));
      const users = sessions.data?.users || activeUsers;

      if (users.length === 0) {
        toast.error('No users available to call');
        return;
      }

      users.forEach(async (targetUserId: string) => {
        if (targetUserId === user?.id) return;

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send offer
        if (socket) {
          socket.emit('voice:call:offer', {
            roomId,
            offer,
            targetUserId,
          });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('voice:call:ice-candidate', {
              roomId,
              candidate: event.candidate,
              targetUserId,
            });
          }
        };

        // Handle remote stream
        pc.ontrack = (event) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(console.error);
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            pc.close();
            peerConnectionsRef.current.delete(targetUserId);
            setActiveUsers((prev) => prev.filter((id) => id !== targetUserId));
            if (peerConnectionsRef.current.size === 0) {
              setIsInCall(false);
            }
          }
        };

        peerConnectionsRef.current.set(targetUserId, pc);
      });

      setIsInCall(true);
      setShowVoiceCall(true);
      toast.success('Call started');
    } catch (error) {
      console.error('Error starting voice call:', error);
      toast.error('Microphone access denied. Please allow microphone access.');
    }
  };

  const endCall = () => {
    peerConnectionsRef.current.forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (socket) {
      socket.emit('voice:call:end', { roomId });
    }

    setIsInCall(false);
    setShowVoiceCall(false);
    setActiveUsers([]);
    toast.success('Call ended');
  };

  const playVoiceNote = (audioData: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioData;
      audioRef.current.play().catch(console.error);
    }
  };

  const shareCodeToWhatsApp = async () => {
    try {
      // Try to get selected text first
      let code = window.getSelection()?.toString();
      
      // If no selection, try to get code from Monaco editor
      if (!code || code.trim().length === 0) {
        // Look for Monaco editor instance in the DOM
        const editorElements = document.querySelectorAll('.monaco-editor');
        if (editorElements.length > 0) {
          // Try to get code from editor via window object (if exposed)
          const monacoEditor = (window as any).monacoEditor;
          if (monacoEditor && monacoEditor.getValue) {
            code = monacoEditor.getValue();
          }
        }
      }

      if (!code || code.trim().length === 0) {
        toast.error('Please select code or open a file to share');
        return;
      }

      // Format code for WhatsApp
      const formattedCode = `*Code Snippet:*\n\`\`\`\n${code}\n\`\`\``;
      const encodedCode = encodeURIComponent(formattedCode);
      const whatsappUrl = `https://wa.me/?text=${encodedCode}`;
      window.open(whatsappUrl, '_blank');
      toast.success('Opening WhatsApp...');
    } catch (error) {
      console.error('Error sharing code:', error);
      toast.error('Failed to share code');
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-surface/95 backdrop-blur-xl">
      <div className="p-4 border-b border-gray-700/50 bg-gray-800/30 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white bg-gradient-to-r from-collab-400 to-pink-400 bg-clip-text text-transparent">
          Chat
        </h3>
        <div className="flex gap-2">
          <button
            onClick={isListening ? stopVoiceAssistant : startVoiceAssistant}
            className={`p-2 rounded-lg transition-all ${
              isListening
                ? 'bg-green-500 text-white animate-pulse'
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-collab-400'
            }`}
            title="AI Voice Assistant"
          >
            <Bot className="w-5 h-5" />
          </button>
          {!isInCall ? (
            <button
              onClick={startVoiceCall}
              className="p-2 text-collab-400 hover:bg-gray-700/50 rounded-lg transition-all"
              title="Start Voice Call"
            >
              <Phone className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={endCall}
              className="p-2 text-red-400 hover:bg-gray-700/50 rounded-lg transition-all"
              title="End Call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={shareCodeToWhatsApp}
            className="p-2 text-green-400 hover:bg-gray-700/50 rounded-lg transition-all"
            title="Share Code to WhatsApp"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showVoiceCall && isInCall && (
        <div className="p-3 bg-gradient-to-r from-collab-500/20 to-pink-500/20 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-300">
              Voice call active ({peerConnectionsRef.current.size} {peerConnectionsRef.current.size === 1 ? 'user' : 'users'})
            </span>
          </div>
          <button
            onClick={() => setShowVoiceCall(false)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isRecording && (
        <div className="p-2 bg-red-500/20 border-b border-red-500/50 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-red-400">
            Recording... {Math.floor(recordingDuration)}s
          </span>
        </div>
      )}

      {isListening && (
        <div className="p-2 bg-green-500/20 border-b border-green-500/50 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-400">AI Assistant listening...</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/30">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-collab-400"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p>No messages yet. Start the conversation!</p>
              <p className="text-xs mt-2 text-gray-500">Type /help for commands or click the bot icon for voice assistant</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.userId === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.userId === 'system' || msg.isCommand
                    ? 'bg-gray-800/70 text-gray-300 border border-gray-700/50'
                    : msg.isAction
                    ? 'bg-gray-800/30 text-gray-400 italic'
                    : msg.userId === user?.id
                    ? 'bg-gradient-to-r from-collab-500 to-pink-500 text-white shadow-lg shadow-collab-500/50'
                    : 'bg-gray-800/50 text-gray-200 border border-gray-700/50'
                }`}
              >
                {msg.userId !== user?.id && msg.userId !== 'system' && (
                  <div className="text-xs font-semibold mb-1 text-collab-400">{msg.userName}</div>
                )}
                {msg.type === 'voice_note' && msg.audioData ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playVoiceNote(msg.audioData!)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <span className="text-xs">{msg.duration ? `${Math.round(msg.duration)}s` : 'Voice note'}</span>
                  </div>
                ) : (
                  <div className={`text-sm ${msg.isAction ? 'italic' : ''} whitespace-pre-wrap`}>
                    {msg.message}
                  </div>
                )}
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
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message or /help for commands..."
              className="flex-1 px-3 py-2 border border-gray-700/50 rounded-lg bg-gray-800/50 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-collab-500 focus:border-transparent"
            />
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`p-2 rounded-lg transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-collab-400'
              }`}
              title="Hold to record voice note"
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Commands: /help, /clear, /users, /me [action], /gif [query] | Voice: Click bot icon
        </div>
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} />
      <audio ref={remoteAudioRef} style={{ display: 'none' }} autoPlay />
    </div>
  );
}
