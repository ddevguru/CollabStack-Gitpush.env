import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import api from '@/services/api';
import { getSocket } from '@/services/socket';
import toast from 'react-hot-toast';
import MonacoEditor from './components/MonacoEditor';
import FileExplorer from './components/FileExplorer';
import ChatPanel from './components/ChatPanel';
import AIChat from './components/AIChat';
import Terminal from './components/Terminal';
import BranchControl from './components/BranchControl';
import PlatformExecution from './components/PlatformExecution';
import CodeMetrics from './components/CodeMetrics';
import RunButton from './components/RunButton';
import ExtensionsPanel from './components/ExtensionsPanel';
import UserPresencePanel from './components/UserPresencePanel';
import ExecutionDashboard from './components/ExecutionDashboard';
import { Calendar } from '@/components/nexus/Calendar';
import { ArrowLeft, BarChart3, Bot, Package, Calendar as CalendarIcon, X, Code2, MessageCircle } from 'lucide-react';
import { shareCodeToWhatsApp, getSelectedCodeFromMonaco, getFullCodeFromMonaco, detectLanguageFromFileName } from '@/utils/whatsappShare';

interface Project {
  id: string;
  name: string;
  description?: string;
  projectType?: string;
  roomId: string;
  settings?: any;
  githubRepoName?: string;
  files: File[];
  branches: Branch[];
  ownerTeam: {
    id: string;
    name: string;
    leader: {
      id: string;
      name: string;
    };
  };
}

interface File {
  id: string;
  path: string;
  content: string;
  isDirectory: boolean;
}

interface Branch {
  id: string;
  name: string;
  gitBranchName?: string;
  lastSyncAt?: string;
}

export default function ProjectView() {
  const { id, roomId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showExtensions, setShowExtensions] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>('');
  const [autoPushTimer, setAutoPushTimer] = useState<NodeJS.Timeout | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | undefined>();
  const monacoEditorRef = useRef<any>(null);
  const [showWhatsAppShareMenu, setShowWhatsAppShareMenu] = useState(false);

  useEffect(() => {
    loadProject();
  }, [id, roomId]);

  // Listen for run events to show execution dashboard
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !project) return;

    const handleRunStarted = (data: { runId: string }) => {
      setCurrentRunId(data.runId);
    };

    const handleRunCompleted = () => {
      // Keep dashboard visible for a few seconds after completion
      setTimeout(() => {
        setCurrentRunId(undefined);
      }, 5000);
    };

    socket.on('run:started', handleRunStarted);
    socket.on('run:completed', handleRunCompleted);

    return () => {
      socket.off('run:started', handleRunStarted);
      socket.off('run:completed', handleRunCompleted);
    };
  }, [project]);

  useEffect(() => {
    if (project) {
      const socket = getSocket();
      if (socket) {
        const projectId = id || project.id;
        socket.emit('room:join', { projectId, roomId: project.roomId });

        socket.on('room:users', (_data: { users: any[] }) => {
          // Users are handled by UserPresencePanel
        });

        socket.on('user:joined', (data: { userId: string; userName: string }) => {
          toast.success(`${data.userName} joined the room`);
        });

        socket.on('user:left', (_data: { userId: string }) => {
          // User presence is handled by UserPresencePanel
        });

        socket.on('file:opened', (_data: { userId: string; filePath: string }) => {
          // Update active users
        });

        socket.on('edit', (_data) => {
          // Handle remote edit
        });

        return () => {
          socket.emit('room:leave', { roomId: project.roomId });
          socket.off('room:users');
          socket.off('user:joined');
          socket.off('user:left');
          socket.off('file:opened');
          socket.off('edit');
        };
      }
    }
  }, [project, selectedFile, user]);

  const loadProject = async () => {
    try {
      let response;
      if (roomId) {
        response = await api.get(`/projects/room/${roomId}`);
      } else if (id) {
        response = await api.get(`/projects/${id}`);
      } else {
        navigate('/');
        return;
      }
      setProject(response.data.data.project);
      // Auto-select first non-directory file, or first file if all are directories
      const files = response.data.data.project.files;
      if (files.length > 0) {
        const firstFile = files.find((f: File) => !f.isDirectory) || files[0];
        if (firstFile) {
          setSelectedFile(firstFile);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load project');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const socket = getSocket();
    if (socket && project) {
      socket.emit('file:open', {
        roomId: project.roomId,
        projectId: project.id,
        filePath: file.path,
      });
    }
  };

  const handleFileSave = async (content: string) => {
    if (!selectedFile || !project) return;

    try {
      await api.put(`/files/${project.id}/${selectedFile.id}`, {
        content,
      });
      
      if (autoPushTimer) {
        clearTimeout(autoPushTimer);
      }

      const settings = project.settings as any;
      if (settings?.autoPush && project.githubRepoName) {
        const timer = setTimeout(async () => {
          try {
            const mainBranch = project.branches.find(b => b.name === 'main');
            const currentBranch = mainBranch?.gitBranchName || 'main';
            
            await api.post(`/github/projects/${project.id}/push`, {
              branchName: currentBranch,
              commitMessage: `Auto-save: ${new Date().toLocaleString()}`,
            });
            console.log('Auto-push successful');
          } catch (error: any) {
            console.error('Auto-push failed:', error.response?.data || error.message);
          }
        }, 2000);
        setAutoPushTimer(timer);
      }
      
      toast.success('File saved');
    } catch (error: any) {
      toast.error('Failed to save file');
    }
  };

  useEffect(() => {
    return () => {
      if (autoPushTimer) {
        clearTimeout(autoPushTimer);
      }
    };
  }, [autoPushTimer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-collab-400"></div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-64 bg-dark-surface/95 backdrop-blur-xl border-r border-gray-700/50 flex flex-col"
      >
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white truncate bg-gradient-to-r from-collab-400 to-pink-400 bg-clip-text text-transparent">
              {project.name}
            </h2>
          </div>
          <p className="text-sm text-gray-400 truncate">{project.ownerTeam.name}</p>
        </div>

        <FileExplorer
          files={project.files}
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
          projectId={project.id}
          onFilesChange={loadProject}
        />

        <div className="mt-auto p-4 border-t border-gray-700/50">
          <UserPresencePanel projectId={project.id} roomId={project.roomId} />
        </div>
      </motion.div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-14 bg-dark-surface/95 backdrop-blur-xl border-b border-gray-700/50 flex items-center justify-between px-4 flex-shrink-0 relative z-50">
          <div className="flex items-center space-x-4 min-w-0">
            {selectedFile && (
              <>
                <span className="text-sm text-gray-300 truncate max-w-xs" title={selectedFile.path}>
                  {selectedFile.path}
                </span>
                <RunButton file={selectedFile} projectId={project.id} />
                <div className="relative">
                  <button
                    onClick={() => setShowWhatsAppShareMenu(!showWhatsAppShareMenu)}
                    className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/50 transition-all"
                    title="Share Code to WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Share
                  </button>
                  {showWhatsAppShareMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[200px]">
                      <button
                        onClick={() => {
                          try {
                            const selectedCode = getSelectedCodeFromMonaco(monacoEditorRef);
                            if (selectedCode) {
                              shareCodeToWhatsApp({
                                code: selectedCode,
                                fileName: selectedFile.path,
                                language: detectLanguageFromFileName(selectedFile.path),
                                shareType: 'selected',
                              });
                              toast.success('Opening WhatsApp with selected code...');
                            } else {
                              toast.error('Please select code to share');
                            }
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to share code');
                          }
                          setShowWhatsAppShareMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4 text-green-400" />
                        Share Selected Code
                      </button>
                      <button
                        onClick={() => {
                          try {
                            const fullCode = getFullCodeFromMonaco(monacoEditorRef) || selectedFile.content;
                            shareCodeToWhatsApp({
                              code: fullCode,
                              fileName: selectedFile.path,
                              language: detectLanguageFromFileName(selectedFile.path),
                              shareType: 'full',
                            });
                            toast.success('Opening WhatsApp with full file...');
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to share code');
                          }
                          setShowWhatsAppShareMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2 border-t border-gray-700"
                      >
                        <MessageCircle className="w-4 h-4 text-green-400" />
                        Share Full File
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 relative z-50">
            <BranchControl project={project} />
            <button
              onClick={() => {
                setShowAIChat(!showAIChat);
                setShowChat(false);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-all ${
                showAIChat
                  ? 'bg-gradient-to-r from-collab-500 to-pink-500 text-white shadow-lg shadow-collab-500/50'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700/50'
              }`}
            >
              <Bot className="w-4 h-4" />
              AI
            </button>
            <button
              onClick={() => {
                setShowChat(!showChat);
                setShowAIChat(false);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                showChat
                  ? 'bg-gradient-to-r from-collab-500 to-pink-500 text-white shadow-lg shadow-collab-500/50'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700/50'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                showTerminal
                  ? 'bg-gradient-to-r from-collab-500 to-pink-500 text-white shadow-lg shadow-collab-500/50'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700/50'
              }`}
            >
              Terminal
            </button>
            <button
              onClick={() => setShowExtensions(!showExtensions)}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-all ${
                showExtensions
                  ? 'bg-gradient-to-r from-collab-500 to-pink-500 text-white shadow-lg shadow-collab-500/50'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700/50'
              }`}
            >
              <Package className="w-4 h-4" />
              Extensions
            </button>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-all ${
                showCalendar
                  ? 'bg-gradient-to-r from-collab-500 to-pink-500 text-white shadow-lg shadow-collab-500/50'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700/50'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-all ${
                showMetrics
                  ? 'bg-gradient-to-r from-collab-500 to-pink-500 text-white shadow-lg shadow-collab-500/50'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Metrics
            </button>
          </div>
        </div>

        {/* Execution Dashboard */}
        {currentRunId && (
          <div className="px-4 pt-2 flex-shrink-0">
            <ExecutionDashboard projectId={project.id} roomId={project.roomId} runId={currentRunId} />
          </div>
        )}

        {/* Platform Execution */}
        {selectedFile && project.projectType && !selectedFile.isDirectory && (
          <div className="px-4 pt-2 flex-shrink-0">
            <PlatformExecution
              projectId={project.id}
              projectType={project.projectType}
              code={currentCode || selectedFile.content}
              language={selectedFile.path.split('.').pop() || 'javascript'}
            />
          </div>
        )}

        {/* Editor - Full Height */}
        <div className="flex-1 relative min-h-0 overflow-hidden">
          {selectedFile ? (
            <div className="absolute inset-0">
              <MonacoEditor
                file={selectedFile}
                onSave={handleFileSave}
                onChange={(content) => setCurrentCode(content)}
                projectId={project.id}
                roomId={project.roomId}
                editorRef={monacoEditorRef}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Code2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a file to start editing</p>
              </div>
            </div>
          )}
        </div>

        {/* Terminal */}
        {showTerminal && (
          <div className="h-64 border-t border-gray-700/50 flex-shrink-0">
            <Terminal projectId={project.id} roomId={project.roomId} />
          </div>
        )}
      </div>

      {/* AI Chat Panel */}
      {showAIChat && (
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          className="w-96 border-l border-gray-700/50 flex-shrink-0"
        >
          <AIChat projectId={project.id} onClose={() => setShowAIChat(false)} />
        </motion.div>
      )}

      {/* Chat Panel */}
      {showChat && (
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          className="w-80 bg-dark-surface/95 backdrop-blur-xl border-l border-gray-700/50 flex-shrink-0"
        >
          <ChatPanel projectId={project.id} roomId={project.roomId} />
        </motion.div>
      )}


      {/* Extensions Panel */}
      {showExtensions && (
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          className="w-96 border-l border-gray-700/50 flex-shrink-0"
        >
          <ExtensionsPanel projectId={project.id} onClose={() => setShowExtensions(false)} />
        </motion.div>
      )}

      {/* Calendar Panel */}
      {showCalendar && (
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          className="w-96 bg-dark-surface/95 backdrop-blur-xl border-l border-gray-700/50 flex-shrink-0 overflow-y-auto"
        >
          <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-collab-400" />
              Calendar
            </h3>
            <button
              onClick={() => setShowCalendar(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <Calendar projectId={project.id} teamId={project.ownerTeam.id} />
        </motion.div>
      )}

      {/* Metrics Panel */}
      {showMetrics && (
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          className="w-96 bg-dark-surface/95 backdrop-blur-xl border-l border-gray-700/50 flex-shrink-0 overflow-y-auto"
        >
          <div className="p-4 border-b border-gray-700/50">
            <h3 className="text-lg font-bold text-white">Code Metrics</h3>
          </div>
          <CodeMetrics projectId={project.id} />
        </motion.div>
      )}
    </div>
  );
}
