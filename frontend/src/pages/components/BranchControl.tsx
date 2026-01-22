import { useState, useEffect, useRef } from 'react';
import { GitBranch, RefreshCw, Settings } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/services/socket';

interface Project {
  id: string;
  name: string;
  githubRepoName?: string;
  githubRepoUrl?: string;
  settings?: any;
  branches: Branch[];
  ownerTeam: {
    leader: {
      id: string;
    };
  };
}

interface Branch {
  id: string;
  name: string;
  gitBranchName?: string;
  lastSyncAt?: string;
}

export default function BranchControl({ project }: { project: Project }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [autoPush, setAutoPush] = useState(project.settings?.autoPush || false);
  const [autoBranching, setAutoBranching] = useState(project.settings?.autoBranching || false);
  const { user } = useAuthStore();
  const socket = getSocket();
  const isLeader = project.ownerTeam.leader.id === user?.id;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Update state when project settings change
    setAutoPush(project.settings?.autoPush || false);
    setAutoBranching(project.settings?.autoBranching || false);
  }, [project.settings]);

  useEffect(() => {
    checkGitHubConnection();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowSettings(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  const checkGitHubConnection = async () => {
    try {
      const response = await api.get('/users/me');
      const userData = response.data.data.user;
      setGithubConnected(!!userData.githubUsername);
    } catch (error) {
      // Ignore
    }
  };

  const logGitHubCommand = (command: string, output?: string) => {
    if (socket) {
      socket.emit('terminal:output', {
        projectId: project.id,
        type: 'github',
        command,
        output: output || 'Executing...',
      });
    }
  };

  const handleSync = async () => {
    try {
      logGitHubCommand('git fetch origin', 'Fetching latest changes from GitHub...');
      await api.post(`/github/projects/${project.id}/sync`);
      logGitHubCommand('git fetch origin', '✓ Synced successfully');
      toast.success('Synced with GitHub');
    } catch (error: any) {
      logGitHubCommand('git fetch origin', `✗ Error: ${error.response?.data?.error?.message || 'Failed to sync'}`);
      toast.error(error.response?.data?.error?.message || 'Failed to sync');
    }
  };

  const handlePush = async (branchName: string) => {
    try {
      const commitMessage = 'Update from collaborative IDE';
      logGitHubCommand(`git push origin ${branchName}`, `Pushing to ${branchName}...`);
      await api.post(`/github/projects/${project.id}/push`, {
        branchName,
        commitMessage,
      });
      logGitHubCommand(`git push origin ${branchName}`, `✓ Pushed successfully with message: "${commitMessage}"`);
      toast.success('Pushed to GitHub');
    } catch (error: any) {
      logGitHubCommand(`git push origin ${branchName}`, `✗ Error: ${error.response?.data?.error?.message || 'Failed to push'}`);
      toast.error(error.response?.data?.error?.message || 'Failed to push');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await api.put(`/projects/${project.id}`, {
        settings: {
          ...project.settings,
          autoPush,
          autoBranching,
        },
      });
      toast.success('Settings updated');
      setShowSettings(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update settings');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className={`flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg transition-all ${
          showMenu
            ? 'bg-gradient-to-r from-collab-500 to-pink-500 text-white shadow-lg shadow-collab-500/50'
            : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700/50'
        }`}
      >
        <GitBranch className="w-4 h-4" />
        <span className="font-semibold">Branches</span>
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[99]" 
            onClick={() => {
              setShowMenu(false);
              setShowSettings(false);
            }}
          />
          {/* Dropdown Menu */}
          <div className="absolute top-full mt-2 right-0 w-80 bg-dark-surface/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-xl shadow-2xl z-[100]">
            <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-white text-lg bg-gradient-to-r from-collab-400 to-pink-400 bg-clip-text text-transparent">Branches</h4>
              <div className="flex items-center gap-2">
                {isLeader && (
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                {project.githubRepoUrl && (
                  <button
                    onClick={handleSync}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
                    title="Sync with GitHub"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && isLeader && (
              <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <h5 className="text-sm font-bold text-white mb-3">GitHub Settings</h5>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-300 font-medium">Auto Push</span>
                    <button
                      onClick={async () => {
                        const newAutoPush = !autoPush;
                        setAutoPush(newAutoPush);
                        // Save immediately
                        try {
                          await api.put(`/projects/${project.id}`, {
                            settings: {
                              ...project.settings,
                              autoPush: newAutoPush,
                            },
                          });
                          toast.success(`Auto push ${newAutoPush ? 'enabled' : 'disabled'}`);
                        } catch (error: any) {
                          toast.error('Failed to update auto push setting');
                          setAutoPush(autoPush); // Revert on error
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoPush ? 'bg-gradient-to-r from-collab-500 to-pink-500' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg ${
                          autoPush ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-300 font-medium">Auto Branching</span>
                    <button
                      onClick={() => setAutoBranching(!autoBranching)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoBranching ? 'bg-gradient-to-r from-collab-500 to-pink-500' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg ${
                          autoBranching ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                  <button
                    onClick={handleUpdateSettings}
                    className="w-full mt-2 px-3 py-2 text-xs bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 transition-all font-semibold"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {project.branches.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No branches found
                </div>
              ) : (
                project.branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 transition-all"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{branch.name}</div>
                      {branch.lastSyncAt && (
                        <div className="text-xs text-gray-400 mt-1">
                          Last sync: {new Date(branch.lastSyncAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    {project.githubRepoUrl && (
                      <button
                        onClick={() => handlePush(branch.name)}
                        disabled={!isLeader && branch.name === 'main'}
                        className="px-3 py-1.5 text-xs bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                      >
                        Push
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {!githubConnected && (
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <p className="text-xs text-yellow-300">
                  Connect GitHub in Settings to enable branch management
                </p>
              </div>
            )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

