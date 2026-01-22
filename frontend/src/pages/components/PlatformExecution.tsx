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
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<string>('');

  useEffect(() => {
    if (projectType) {
      loadPlatforms();
    }
  }, [projectType]);

  const loadPlatforms = async () => {
    try {
      const response = await api.get(`/platform/platforms/${projectType || 'generic'}`);
      setPlatforms(response.data.data.platforms);
      if (response.data.data.platforms.length > 0) {
        setSelectedPlatform(response.data.data.platforms[0]);
      }
    } catch (error) {
      console.error('Failed to load platforms');
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
          const runResponse = await api.get(`/runs/${runId}`);
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

  if (platforms.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Platform Execution</h3>
        <div className="flex items-center gap-2">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            disabled={isExecuting}
          >
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </option>
            ))}
          </select>
          <button
            onClick={handleExecute}
            disabled={isExecuting || !code}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {getPlatformIcon(selectedPlatform)}
            {isExecuting ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {output && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {output}
          </div>
        </div>
      )}
    </div>
  );
}

