import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { getSocket } from '@/services/socket';
import toast from 'react-hot-toast';
import MonacoEditor from './components/MonacoEditor';
import FileExplorer from './components/FileExplorer';
import ChatPanel from './components/ChatPanel';
import Terminal from './components/Terminal';
import BranchControl from './components/BranchControl';
import PlatformExecution from './components/PlatformExecution';
import CodeMetrics from './components/CodeMetrics';
import RunButton from './components/RunButton';
import { ArrowLeft, Users, BarChart3 } from 'lucide-react';

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
  const { user } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [currentCode, setCurrentCode] = useState<string>('');
  const [autoPushTimer, setAutoPushTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadProject();
  }, [id, roomId]);

  useEffect(() => {
    if (project) {
      const socket = getSocket();
      if (socket) {
        const projectId = id || project.id;
        socket.emit('room:join', { projectId, roomId: project.roomId });

        socket.on('room:users', (data: { users: any[] }) => {
          setActiveUsers(data.users);
        });

        socket.on('user:joined', (data: { userId: string; userName: string }) => {
          toast.success(`${data.userName} joined the room`);
        });

        socket.on('user:left', (data: { userId: string }) => {
          setActiveUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        });

        socket.on('file:opened', (_data: { userId: string; filePath: string }) => {
          // Update active users
        });

        socket.on('edit', (_data) => {
          // Handle remote edit
          // This would be handled by Monaco Editor's collaboration plugin
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
      if (response.data.data.project.files.length > 0) {
        setSelectedFile(response.data.data.project.files[0]);
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
      
      // Clear existing timer
      if (autoPushTimer) {
        clearTimeout(autoPushTimer);
      }

      // If auto-push is enabled, set up timer for 2 seconds
      const settings = project.settings as any;
      if (settings?.autoPush && project.githubRepoName) {
        const timer = setTimeout(async () => {
          try {
            // Get current branch (default to main)
            const mainBranch = project.branches.find(b => b.name === 'main');
            const currentBranch = mainBranch?.gitBranchName || 'main';
            
            await api.post(`/github/projects/${project.id}/push`, {
              branchName: currentBranch,
              commitMessage: `Auto-save: ${new Date().toLocaleString()}`,
            });
            console.log('Auto-push successful');
            // Don't show toast for auto-push to avoid spam
          } catch (error: any) {
            // Log error but don't show toast to avoid spam
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoPushTimer) {
        clearTimeout(autoPushTimer);
      }
    };
  }, [autoPushTimer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{project.name}</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{project.ownerTeam.name}</p>
        </div>

        <FileExplorer
          files={project.files}
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
          projectId={project.id}
        />

        <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Users</span>
          </div>
          <div className="space-y-1">
            {activeUsers.map((activeUser) => (
              <div
                key={activeUser.userId}
                className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: `hsl(${activeUser.userId.charCodeAt(0) * 137.508}, 70%, 50%)`,
                  }}
                />
                <span>{activeUser.userName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            {selectedFile && (
              <>
                <span className="text-sm text-gray-700 dark:text-gray-300">{selectedFile.path}</span>
                <RunButton file={selectedFile} projectId={project.id} />
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <BranchControl project={project} />
            <button
              onClick={() => setShowChat(!showChat)}
              className={`px-3 py-1 text-sm rounded ${
                showChat
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`px-3 py-1 text-sm rounded ${
                showTerminal
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Terminal
            </button>
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
                showMetrics
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Metrics
            </button>
          </div>
        </div>

        {/* Platform Execution */}
        {selectedFile && project.projectType && !selectedFile.isDirectory && (
          <div className="px-4 pt-2">
            <PlatformExecution
              projectId={project.id}
              projectType={project.projectType}
              code={currentCode || selectedFile.content}
              language={selectedFile.path.split('.').pop() || 'javascript'}
            />
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 relative">
          {selectedFile ? (
            <MonacoEditor
              file={selectedFile}
              onSave={handleFileSave}
              onChange={(content) => setCurrentCode(content)}
              projectId={project.id}
              roomId={project.roomId}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              Select a file to start editing
            </div>
          )}
        </div>

        {/* Terminal */}
        {showTerminal && (
          <div className="h-64 border-t border-gray-200 dark:border-gray-700">
            <Terminal projectId={project.id} roomId={project.roomId} />
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          <ChatPanel projectId={project.id} roomId={project.roomId} />
        </div>
      )}

      {/* Metrics Panel */}
      {showMetrics && (
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Code Metrics</h3>
          </div>
          <CodeMetrics projectId={project.id} />
        </div>
      )}
    </div>
  );
}

