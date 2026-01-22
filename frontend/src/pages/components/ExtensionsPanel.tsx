import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, Download, Check, X, Settings, Code2 } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface Extension {
  id: string;
  name: string;
  publisher: string;
  description: string;
  version: string;
  icon?: string;
  installed: boolean;
  category: string;
}

interface ExtensionsPanelProps {
  projectId: string;
  onClose?: () => void;
}

export default function ExtensionsPanel({ projectId, onClose }: ExtensionsPanelProps) {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [installedExtensions, setInstalledExtensions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    loadExtensions();
    loadInstalledExtensions();
  }, [projectId]);

  const loadExtensions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/extensions/marketplace', {
        params: { search: searchQuery },
      });
      if (response.data.success) {
        setExtensions(response.data.data.extensions || []);
      }
    } catch (error) {
      // If marketplace not available, show default extensions
      setExtensions(getDefaultExtensions());
    } finally {
      setLoading(false);
    }
  };

  const loadInstalledExtensions = async () => {
    try {
      const response = await api.get(`/extensions/projects/${projectId}`);
      if (response.data.success) {
        setInstalledExtensions(response.data.data.extensions.map((e: any) => e.id));
      }
    } catch (error) {
      // Ignore
    }
  };

  const getDefaultExtensions = (): Extension[] => {
    return [
      {
        id: 'prettier',
        name: 'Prettier',
        publisher: 'Prettier',
        description: 'Code formatter for JavaScript, TypeScript, CSS, and more',
        version: '9.0.0',
        category: 'Formatter',
        installed: installedExtensions.includes('prettier'),
      },
      {
        id: 'eslint',
        name: 'ESLint',
        publisher: 'Microsoft',
        description: 'Find and fix problems in your JavaScript code',
        version: '3.0.0',
        category: 'Linter',
        installed: installedExtensions.includes('eslint'),
      },
      {
        id: 'gitlens',
        name: 'GitLens',
        publisher: 'GitKraken',
        description: 'Supercharge Git capabilities with GitLens',
        version: '14.0.0',
        category: 'Git',
        installed: installedExtensions.includes('gitlens'),
      },
      {
        id: 'thunder-client',
        name: 'Thunder Client',
        publisher: 'Ranga Vadhineni',
        description: 'Lightweight REST API Client for VS Code',
        version: '1.19.0',
        category: 'API',
        installed: installedExtensions.includes('thunder-client'),
      },
      {
        id: 'auto-rename-tag',
        name: 'Auto Rename Tag',
        publisher: 'Jun Han',
        description: 'Auto rename paired HTML/XML tag',
        version: '0.1.10',
        category: 'HTML',
        installed: installedExtensions.includes('auto-rename-tag'),
      },
      {
        id: 'bracket-pair-colorizer',
        name: 'Bracket Pair Colorizer',
        publisher: 'CoenraadS',
        description: 'Colorize matching brackets',
        version: '1.0.62',
        category: 'Editor',
        installed: installedExtensions.includes('bracket-pair-colorizer'),
      },
    ];
  };

  const handleInstall = async (extensionId: string) => {
    setInstalling(extensionId);
    try {
      await api.post(`/extensions/projects/${projectId}/install`, {
        extensionId,
      });
      toast.success('Extension installed successfully');
      setInstalledExtensions([...installedExtensions, extensionId]);
      setExtensions((prev) =>
        prev.map((ext) =>
          ext.id === extensionId ? { ...ext, installed: true } : ext
        )
      );
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to install extension');
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (extensionId: string) => {
    setInstalling(extensionId);
    try {
      await api.delete(`/extensions/projects/${projectId}/${extensionId}`);
      toast.success('Extension uninstalled');
      setInstalledExtensions(installedExtensions.filter((id) => id !== extensionId));
      setExtensions((prev) =>
        prev.map((ext) =>
          ext.id === extensionId ? { ...ext, installed: false } : ext
        )
      );
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to uninstall extension');
    } finally {
      setInstalling(null);
    }
  };

  const filteredExtensions = extensions.filter((ext) =>
    ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ext.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-dark-surface/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-collab-400" />
          <h3 className="text-lg font-bold text-white">Extensions</h3>
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

      {/* Search */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search extensions..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-collab-500"
          />
        </div>
      </div>

      {/* Extensions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-collab-400"></div>
          </div>
        ) : filteredExtensions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No extensions found</p>
          </div>
        ) : (
          filteredExtensions.map((extension) => (
            <motion.div
              key={extension.id}
              whileHover={{ scale: 1.02 }}
              className="p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {extension.icon ? (
                      <img src={extension.icon} alt={extension.name} className="w-6 h-6" />
                    ) : (
                      <Code2 className="w-6 h-6 text-collab-400" />
                    )}
                    <h4 className="font-semibold text-white">{extension.name}</h4>
                    {extension.installed && (
                      <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                        Installed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{extension.publisher}</p>
                  <p className="text-sm text-gray-300 mb-2">{extension.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{extension.category}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">v{extension.version}</span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    extension.installed
                      ? handleUninstall(extension.id)
                      : handleInstall(extension.id)
                  }
                  disabled={installing === extension.id}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    extension.installed
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-gradient-to-r from-collab-500 to-pink-500 text-white hover:shadow-lg hover:shadow-collab-500/50'
                  } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                >
                  {installing === extension.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {extension.installed ? 'Uninstalling...' : 'Installing...'}
                    </>
                  ) : extension.installed ? (
                    <>
                      <X className="w-4 h-4" />
                      Uninstall
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Install
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

