import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface RunButtonProps {
  file: {
    id: string;
    path: string;
    content: string;
    isDirectory: boolean;
  };
  projectId: string;
}

const RUNNABLE_EXTENSIONS = [
  'html',
  'htm',
  'js',
  'jsx',
  'ts',
  'tsx',
  'py',
  'java',
  'cpp',
  'c',
  'go',
  'rs',
  'php',
  'rb',
  'swift',
  'kt',
  'dart',
  'r',
  'scala',
  'sh',
  'ps1',
];

export default function RunButton({ file, projectId }: RunButtonProps) {
  const [isRunning, setIsRunning] = useState(false);

  const canRun = () => {
    if (file.isDirectory) return false;
    const ext = file.path.split('.').pop()?.toLowerCase();
    return ext && RUNNABLE_EXTENSIONS.includes(ext);
  };

  const handleRun = async () => {
    if (!canRun()) return;

    const ext = file.path.split('.').pop()?.toLowerCase();

    // HTML files - open in new tab
    if (ext === 'html' || ext === 'htm') {
      const blob = new Blob([file.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('Opening HTML file in new tab');
      return;
    }

    // Other files - execute via API
    setIsRunning(true);
    try {
      const language = getLanguageFromExt(ext || '');
      const response = await api.post(`/runs/${projectId}`, {
        language,
        code: file.content,
        stdin: '',
      });

      const runId = response.data.data.run.id;
      
      // Poll for results
      const pollInterval = setInterval(async () => {
        try {
          const runResponse = await api.get(`/runs/${projectId}/${runId}`);
          const run = runResponse.data.data.run;
          
          if (run.status === 'SUCCESS' || run.status === 'ERROR') {
            clearInterval(pollInterval);
            setIsRunning(false);
            
            if (run.status === 'SUCCESS') {
              toast.success('Code executed successfully!');
              // Show output in a modal or terminal
              if (run.output) {
                console.log('Output:', run.output);
              }
            } else {
              toast.error(run.error || 'Execution failed');
            }
          }
        } catch (error) {
          clearInterval(pollInterval);
          setIsRunning(false);
          toast.error('Failed to get execution results');
        }
      }, 1000);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsRunning(false);
      }, 30000);
    } catch (error: any) {
      setIsRunning(false);
      toast.error(error.response?.data?.error?.message || 'Failed to run code');
    }
  };

  const getLanguageFromExt = (ext: string): string => {
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      kt: 'kotlin',
      dart: 'dart',
      r: 'r',
      scala: 'scala',
      sh: 'bash',
      ps1: 'powershell',
    };
    return langMap[ext] || 'javascript';
  };

  if (!canRun()) return null;

  const ext = file.path.split('.').pop()?.toLowerCase();
  const isHTML = ext === 'html' || ext === 'htm';

  return (
    <button
      onClick={handleRun}
      disabled={isRunning}
      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      title={isHTML ? 'Open in new tab' : 'Run code'}
    >
      {isRunning ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          Running...
        </>
      ) : isHTML ? (
        <>
          <ExternalLink className="w-4 h-4" />
          Open
        </>
      ) : (
        <>
          <Play className="w-4 h-4" />
          Run
        </>
      )}
    </button>
  );
}

