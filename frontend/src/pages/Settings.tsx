import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Github, Cloud, Code2, CheckCircle2, XCircle, Settings as SettingsIcon, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageLayout } from '@/components/nexus/PageLayout';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [githubConnected, setGithubConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [driveAutoSync, setDriveAutoSync] = useState(false);

  useEffect(() => {
    checkConnections();
    
    // Check connections again when component becomes visible (e.g., after OAuth callback)
    const handleFocus = () => {
      checkConnections();
    };
    window.addEventListener('focus', handleFocus);
    
    // Also check when navigating back to settings
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkConnections();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const checkConnections = async () => {
    try {
      const response = await api.get('/users/me');
      const userData = response.data.data.user;
      setGithubConnected(!!userData.githubUsername);
      // Check Google connection status
      setGoogleConnected(!!userData.hasGoogleAccount);
      
      // Check Drive auto-sync settings from projects
      if (userData.hasGoogleAccount) {
        try {
          const projectsResponse = await api.get('/projects');
          const projects = projectsResponse.data?.data?.projects || [];
          const hasAutoSync = projects.some((p: any) => p.driveSyncMode === 'AUTO');
          setDriveAutoSync(hasAutoSync);
        } catch (error) {
          console.error('Error checking drive sync mode:', error);
        }
      }
    } catch (error) {
      console.error('Error checking connections:', error);
      // Ignore
    }
  };

  const handleGitHubConnect = async () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      toast.error('GitHub Client ID not configured. Please check your .env file.');
      return;
    }
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    // Request necessary scopes for GitHub API access
    const scopes = 'user:email,repo,write:packages,read:packages';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}`;
  };

  const handleGoogleConnect = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error('Google Client ID not configured. Please check your .env file.');
      return;
    }
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    // Include all necessary scopes: Drive, Calendar, Meet, and User Info
    const scope = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
  };

  const handleToggleDriveAutoSync = async () => {
    try {
      // Get all user's projects and enable/disable auto-sync
      const projectsResponse = await api.get('/projects');
      const projects = projectsResponse.data?.data?.projects || [];
      
      const newSyncMode = !driveAutoSync ? 'AUTO' : 'OFF';
      
      // Update all projects
      const updatePromises = projects.map(async (project: any) => {
        // First ensure Drive folder exists
        if (newSyncMode === 'AUTO' && !project.driveFolderId) {
          try {
            await api.post(`/drive/projects/${project.id}/folder`);
          } catch (error) {
            console.error(`Failed to create folder for ${project.name}:`, error);
          }
        }
        
        // Update sync mode
        return api.put(`/projects/${project.id}`, {
          driveSyncMode: newSyncMode,
        });
      });
      
      await Promise.all(updatePromises);
      
      setDriveAutoSync(!driveAutoSync);
      toast.success(driveAutoSync ? 'Auto-sync disabled for all projects' : 'Auto-sync enabled for all projects');
    } catch (error: any) {
      console.error('Error updating auto-sync:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update auto-sync settings');
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-dark">
        {/* Header */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-surface/95 backdrop-blur-xl border-b-2 border-gray-700/50 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Code2 className="w-8 h-8 text-collab-400" />
                <span className="text-2xl font-black text-white">
                  Collab<span className="bg-gradient-to-r from-collab-400 to-pink-400 bg-clip-text text-transparent">Stack</span>
                </span>
                <span className="text-gray-400 ml-4">Settings</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-surface/60 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl mb-6"
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-collab-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">{user?.name}</h2>
                <p className="text-gray-400 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Settings Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Integrations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-dark-surface/60 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Cloud className="w-6 h-6 text-collab-400" />
                  <h2 className="text-xl font-bold text-white">Integrations</h2>
                </div>

                <div className="space-y-4">
                  {/* GitHub Integration */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center">
                          <Github className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white mb-1">GitHub</h3>
                          <p className="text-sm text-gray-400">
                            {githubConnected ? 'Connected' : 'Connect your GitHub account'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {githubConnected ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-500" />
                        )}
                        <button
                          onClick={handleGitHubConnect}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            githubConnected
                              ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                              : 'bg-gradient-to-r from-collab-500 to-pink-500 text-white hover:shadow-lg hover:shadow-collab-500/50'
                          }`}
                        >
                          {githubConnected ? 'Reconnect' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Google Drive Integration */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
                          <Cloud className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">Google Account</h3>
                          <p className="text-sm text-gray-400">
                            {googleConnected 
                              ? 'Connected - Access to Drive, Calendar & Meet enabled' 
                              : 'Connect for Drive, Calendar & Meet features'}
                          </p>
                          {!googleConnected && (
                            <p className="text-xs text-gray-500 mt-1">
                              Required for: Google Drive sync, Calendar reminders, Google Meet
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {googleConnected ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-500" />
                        )}
                        <button
                          onClick={handleGoogleConnect}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            googleConnected
                              ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                              : 'bg-gradient-to-r from-collab-500 to-pink-500 text-white hover:shadow-lg hover:shadow-collab-500/50'
                          }`}
                        >
                          {googleConnected ? 'Reconnect' : 'Connect Google'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Drive Auto-Sync Toggle */}
                  {googleConnected && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-white mb-1">Auto-Sync to Drive</h3>
                          <p className="text-sm text-gray-400">
                            Automatically upload project files to Google Drive
                          </p>
                        </div>
                        <button
                          onClick={handleToggleDriveAutoSync}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            driveAutoSync ? 'bg-collab-500' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              driveAutoSync ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* API Keys Setup Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-3xl border border-blue-500/30 p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  API Keys Setup
                </h3>
                <p className="text-sm text-gray-300 mb-4">
                  Need help setting up API keys? Check out the detailed guide for step-by-step instructions.
                </p>
                <div className="flex gap-3">
                  <a
                    href="https://github.com/settings/developers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-all"
                  >
                    GitHub OAuth Apps →
                  </a>
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-all"
                  >
                    Google Cloud Console →
                  </a>
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-dark-surface/60 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-2xl"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-all"
                  >
                    ← Back to Dashboard
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

