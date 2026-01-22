import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Github, Cloud } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { user: _user } = useAuthStore();
  const [githubConnected, setGithubConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    try {
      const response = await api.get('/users/me');
      const userData = response.data.data.user;
      setGithubConnected(!!userData.githubUsername);
      // Google connection status is not directly exposed for security
      // We'll check based on auth providers
      const hasGoogle = Array.isArray(userData.authProviders) && userData.authProviders.includes('GOOGLE');
      setGoogleConnected(hasGoogle);
    } catch (error) {
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
    const scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="mr-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Keys Setup</h2>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              <strong>Need help setting up API keys?</strong>
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              Check out the detailed guide in <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">API_KEYS_SETUP.md</code> file
              for step-by-step instructions on getting GitHub and Google OAuth credentials.
            </p>
            <a
              href="https://github.com/settings/developers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mr-4"
            >
              GitHub OAuth Apps →
            </a>
            <a
              href="https://console.cloud.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Google Cloud Console →
            </a>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Integrations</h2>

          <div className="space-y-4">
            {/* GitHub Integration */}
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-4">
                <Github className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">GitHub</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {githubConnected ? 'Connected' : 'Connect your GitHub account'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleGitHubConnect}
                className={`px-4 py-2 rounded-md ${
                  githubConnected
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {githubConnected ? 'Reconnect' : 'Connect'}
              </button>
            </div>

            {/* Google Drive Integration */}
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-4">
                <Cloud className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Google Drive</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {googleConnected ? 'Connected' : 'Connect your Google Drive'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleGoogleConnect}
                className={`px-4 py-2 rounded-md ${
                  googleConnected
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {googleConnected ? 'Reconnect' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

