import { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Update state when project settings change
    setAutoPush(project.settings?.autoPush || false);
    setAutoBranching(project.settings?.autoBranching || false);
  }, [project.settings]);

  useEffect(() => {
    checkGitHubConnection();
  }, []);

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
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
      >
        <GitBranch className="w-4 h-4" />
        <span>Branches</span>
      </button>

      {showMenu && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">Branches</h4>
              <div className="flex items-center gap-2">
                {isLeader && (
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                {project.githubRepoUrl && (
                  <button
                    onClick={handleSync}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    title="Sync with GitHub"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && isLeader && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">GitHub Settings</h5>
                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Auto Push</span>
                    <button
                      onClick={() => setAutoPush(!autoPush)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoPush ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoPush ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Auto Branching</span>
                    <button
                      onClick={() => setAutoBranching(!autoBranching)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoBranching ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoBranching ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                  <button
                    onClick={handleUpdateSettings}
                    className="w-full mt-2 px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {project.branches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{branch.name}</div>
                    {branch.lastSyncAt && (
                      <div className="text-xs text-gray-500">
                        Last sync: {new Date(branch.lastSyncAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  {project.githubRepoUrl && (
                    <button
                      onClick={() => handlePush(branch.name)}
                      disabled={!isLeader && branch.name === 'main'}
                      className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Push
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!githubConnected && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  Connect GitHub in Settings to enable branch management
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

