import { useState, useEffect } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Play, Monitor, Smartphone, Server, Globe } from 'lucide-react';

interface PlatformExecutionProps {
  projectId: string;
  projectType?: string;
  code: string;
  language: string;
}

export default function PlatformExecution({ projectId, projectType, code, language }: PlatformExecutionProps) {
  const [platforms, setPlatforms] = useState<string[]>(['web']); // Default to web
  const [selectedPlatform, setSelectedPlatform] = useState<string>('web');
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<string>('');

  useEffect(() => {
    if (projectType) {
      loadPlatforms();
    } else {
      // Default platforms for unknown project types
      setPlatforms(['web']);
      setSelectedPlatform('web');
    }
  }, [projectType]);

  const loadPlatforms = async () => {
    try {
      const response = await api.get(`/platform/platforms/${projectType || 'generic'}`);
      const loadedPlatforms = response.data.data.platforms || ['web'];
      setPlatforms(loadedPlatforms);
      if (loadedPlatforms.length > 0) {
        setSelectedPlatform(loadedPlatforms[0]);
      }
    } catch (error) {
      console.error('Failed to load platforms, using default:', error);
      // Fallback to web platform
      setPlatforms(['web']);
      setSelectedPlatform('web');
    }
  };

  const handleExecute = async () => {
    if (!selectedPlatform || !code) {
      toast.error('Please select a platform and write some code');
      return;
    }

    setIsExecuting(true);
    setOutput('');

    try {
      const response = await api.post('/platform/execute', {
        projectId,
        code,
        language,
        platform: selectedPlatform,
      });

      const runId = response.data.data.run.id;
      
      // Poll for results
      const pollInterval = setInterval(async () => {
        try {
          const runResponse = await api.get(`/runs/${projectId}/${runId}`);
          const run = runResponse.data.data.run;
          
          if (run.status === 'SUCCESS' || run.status === 'ERROR') {
            clearInterval(pollInterval);
            setIsExecuting(false);
            setOutput(run.output || run.error || 'Execution completed');
            
            if (run.status === 'SUCCESS') {
              toast.success('Code executed successfully!');
            } else {
              toast.error('Execution failed');
            }
          }
        } catch (error) {
          clearInterval(pollInterval);
          setIsExecuting(false);
          toast.error('Failed to get execution results');
        }
      }, 1000);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsExecuting(false);
        if (output === '') {
          toast.error('Execution timeout');
        }
      }, 30000);
    } catch (error: any) {
      setIsExecuting(false);
      toast.error(error.response?.data?.error?.message || 'Failed to execute code');
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'web':
        return <Globe className="w-4 h-4" />;
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      case 'server':
        return <Server className="w-4 h-4" />;
      default:
        return <Play className="w-4 h-4" />;
    }
  };

  // Always show if projectType exists (defaults to web if platforms not loaded)
  if (!projectType) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 mb-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-collab-500 to-pink-500 flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Platform Execution</h3>
            <p className="text-xs text-gray-400">Run your code on different platforms</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPlatform || 'web'}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="px-4 py-2 border border-gray-700/50 rounded-lg bg-gray-800/60 text-white text-sm focus:outline-none focus:ring-2 focus:ring-collab-500 focus:border-transparent backdrop-blur-sm"
            disabled={isExecuting}
          >
            {platforms.length > 0 ? (
              platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </option>
              ))
            ) : (
              <option value="web">Web</option>
            )}
          </select>
          <button
            onClick={handleExecute}
            disabled={isExecuting || !code || !selectedPlatform}
            className="px-6 py-2 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all"
          >
            {isExecuting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Running...
              </>
            ) : (
              <>
                {getPlatformIcon(selectedPlatform || 'web')}
                Run
              </>
            )}
          </button>
        </div>
      </div>

      {output && (
        <div className="mt-4 p-4 bg-gray-900/60 rounded-lg border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase">Output</span>
            <button
              onClick={() => setOutput('')}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="text-sm font-mono text-gray-200 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {output}
          </div>
        </div>
      )}
      
      {isExecuting && !output && (
        <div className="mt-4 p-4 bg-gray-900/40 rounded-lg border border-gray-700/30 flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-collab-400"></div>
          <span className="text-sm text-gray-400">Executing code...</span>
        </div>
      )}
    </div>
  );
}

