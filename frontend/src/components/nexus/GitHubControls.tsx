import { motion } from 'framer-motion';
import { Github, GitBranch, Upload, CheckCircle2, XCircle } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useUserStore } from '../../stores/userStore';

export const GitHubControls = () => {
  const currentProject = useProjectStore((state) => state.currentProject);
  const integrations = useUserStore((state) => state.integrations);
  const updateSettings = useProjectStore((state) => state.updateSettings);

  const isConnected = integrations.github.connected;
  const activeBranch = currentProject?.branches.find((b) => b.isActive);
  const autoPush = currentProject?.settings.autoPush ?? false;

  return (
    <div className="bg-dark-surface rounded-lg border border-gray-800 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Github className="w-5 h-5 text-collab-500" />
        <h3 className="font-semibold text-white">GitHub Sync</h3>
        {isConnected ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <XCircle className="w-4 h-4 text-gray-500" />
        )}
      </div>

      {isConnected ? (
        <>
          <div className="flex items-center gap-2 text-sm">
            <GitBranch className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">Branch:</span>
            <span className="text-white font-mono">{activeBranch?.name || 'main'}</span>
            {activeBranch && (
              <div className="flex items-center gap-1 ml-auto">
                {activeBranch.ahead > 0 && (
                  <span className="text-xs text-emerald-500">
                    +{activeBranch.ahead}
                  </span>
                )}
                {activeBranch.behind > 0 && (
                  <span className="text-xs text-pink-500">
                    -{activeBranch.behind}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPush}
                onChange={(e) =>
                  updateSettings({ autoPush: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-collab-500 focus:ring-collab-500"
              />
              <span>Auto-push</span>
            </label>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-4 py-2 bg-gradient-collab text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Upload className="w-4 h-4" />
            Push Now
          </motion.button>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 mb-3">
            Connect GitHub to enable sync
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
          >
            Connect GitHub
          </motion.button>
        </div>
      )}
    </div>
  );
};

