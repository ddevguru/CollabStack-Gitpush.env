import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/services/socket';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Play, Square, Trash2, Copy, Terminal as TerminalIcon } from 'lucide-react';

interface TerminalProps {
  projectId: string;
  roomId: string;
}

interface Run {
  id: string;
  language: string;
  code: string;
  stdin?: string;
  status: string;
  output?: string;
  error?: string;
  timeMs?: number;
  createdAt: string;
}

export default function Terminal({ projectId, roomId }: TerminalProps) {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [runs, setRuns] = useState<Run[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentCommand, setCurrentCommand] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(true);
  const [resourceType, setResourceType] = useState<'CPU' | 'GPU'>('CPU');
  const socket = getSocket();
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleRunStarted = (data: any) => {
      setIsRunning(true);
      addOutput(`[${new Date().toLocaleTimeString()}] Running ${data.language} code...\n`, 'info');
    };

    const handleRunCompleted = (data: { run: Run }) => {
      setIsRunning(false);
      setRuns((prev) => [data.run, ...prev]);
      if (data.run.output) {
        addOutput(data.run.output, 'output');
      }
      if (data.run.error) {
        addOutput(data.run.error, 'error');
      }
      if (data.run.timeMs) {
        addOutput(`\nExecution time: ${data.run.timeMs}ms\n`, 'info');
      }
      addOutput(`\n${getPrompt()}`, 'prompt');
    };

    const handleTerminalOutput = (data: any) => {
      if (data.projectId === projectId && data.type === 'github') {
        addOutput(`\n[GitHub] ${data.command}\n`, 'info');
        if (data.output) {
          addOutput(`${data.output}\n`, data.output.includes('✓') ? 'output' : data.output.includes('✗') ? 'error' : 'info');
        }
        addOutput(`${getPrompt()}`, 'prompt');
      }
    };

    socket.on('run:started', handleRunStarted);
    socket.on('run:completed', handleRunCompleted);
    socket.on('terminal:output', handleTerminalOutput);

    return () => {
      socket.off('run:started', handleRunStarted);
      socket.off('run:completed', handleRunCompleted);
      socket.off('terminal:output', handleTerminalOutput);
    };
  }, [socket, projectId]);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [runs]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const getPrompt = () => {
    return `$ `;
  };

  const addOutput = (text: string, type: 'output' | 'error' | 'info' | 'prompt' = 'output') => {
    const newRun: Run = {
      id: Date.now().toString(),
      language,
      code: '',
      status: 'SUCCESS',
      output: type === 'output' ? text : undefined,
      error: type === 'error' ? text : undefined,
      createdAt: new Date().toISOString(),
    };
    setRuns((prev) => [...prev, newRun]);
  };

  const handleCommand = async (command: string) => {
    if (!command.trim()) {
      addOutput(`${getPrompt()}`, 'prompt');
      return;
    }

    addOutput(`${getPrompt()}${command}\n`, 'prompt');
    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);
    setCurrentCommand('');

    const parts = command.trim().split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case 'clear':
      case 'cls':
        setRuns([]);
        addOutput(`${getPrompt()}`, 'prompt');
        break;
      case 'run':
        if (code.trim()) {
          await handleRun();
        } else {
          addOutput('No code to run. Please write code in the editor.\n', 'error');
          addOutput(`${getPrompt()}`, 'prompt');
        }
        break;
      case 'help':
        addOutput(`Available commands:
  clear, cls    - Clear terminal
  run           - Run code from editor
  lang <name>   - Set language (javascript, typescript, python, java, cpp, c, go, rust, php, ruby, swift, kotlin, dart, r, scala, bash, powershell)
  code          - Show current code
  history       - Show command history
  gpu           - Switch to GPU execution (uses compute credits)
  cpu           - Switch to CPU execution (free)
  credits       - Show compute credits balance
  help          - Show this help message
`, 'info');
        addOutput(`${getPrompt()}`, 'prompt');
        break;
      case 'gpu':
        setResourceType('GPU');
        addOutput('Switched to GPU execution mode (uses compute credits)\n', 'info');
        addOutput(`${getPrompt()}`, 'prompt');
        break;
      case 'cpu':
        setResourceType('CPU');
        addOutput('Switched to CPU execution mode (free)\n', 'info');
        addOutput(`${getPrompt()}`, 'prompt');
        break;
      case 'credits':
        try {
          const creditsRes = await api.get('/compute/credits');
          const credits = creditsRes.data.data.credits;
          addOutput(`\nCompute Credits Balance: ${credits.balance.toFixed(2)}\n`, 'info');
          addOutput(`Total Earned: ${credits.totalEarned.toFixed(2)}\n`, 'info');
          addOutput(`Total Spent: ${credits.totalSpent.toFixed(2)}\n`, 'info');
        } catch (error) {
          addOutput('Failed to fetch credits\n', 'error');
        }
        addOutput(`${getPrompt()}`, 'prompt');
        break;
      case 'lang':
        if (parts[1]) {
          setLanguage(parts[1]);
          addOutput(`Language set to: ${parts[1]}\n`, 'info');
        } else {
          addOutput(`Current language: ${language}\n`, 'info');
        }
        addOutput(`${getPrompt()}`, 'prompt');
        break;
      case 'code':
        addOutput(`\nCurrent code:\n${code || '(empty)'}\n`, 'info');
        addOutput(`${getPrompt()}`, 'prompt');
        break;
      case 'history':
        addOutput(`\nCommand history:\n${commandHistory.slice(-10).join('\n')}\n`, 'info');
        addOutput(`${getPrompt()}`, 'prompt');
        break;
      default:
        addOutput(`Command not found: ${cmd}. Type 'help' for available commands.\n`, 'error');
        addOutput(`${getPrompt()}`, 'prompt');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommand(currentCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast.error('Please enter code to run');
      return;
    }

    try {
      // Check if user wants to use compute credits for GPU execution
      const useGPU = resourceType === 'GPU';
      
      if (useGPU) {
        // Create compute job
        const jobResponse = await api.post('/compute/jobs', {
          projectId,
          language,
          code,
          resourceType: 'GPU',
          gpuType: 'T4',
        });
        
        const job = jobResponse.data.data.job;
        addOutput(`\n[Compute] Job ${job.id.substring(0, 8)} created. Status: ${job.status}\n`, 'info');
        addOutput(`Credits used: ${job.creditsUsed.toFixed(2)}\n`, 'info');
        addOutput(`Queueing for GPU execution...\n`, 'info');
        
        // Poll for job status
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await api.get(`/compute/jobs/${job.id}`);
            const updatedJob = statusResponse.data.data.job;
            
            if (updatedJob.status === 'COMPLETED') {
              clearInterval(pollInterval);
              if (updatedJob.output) {
                addOutput(updatedJob.output, 'output');
              }
              if (updatedJob.error) {
                addOutput(updatedJob.error, 'error');
              }
              addOutput(`\nJob completed in ${updatedJob.computeHours.toFixed(2)} hours\n`, 'info');
              addOutput(`${getPrompt()}`, 'prompt');
            } else if (updatedJob.status === 'FAILED') {
              clearInterval(pollInterval);
              addOutput('Job failed\n', 'error');
              addOutput(`${getPrompt()}`, 'prompt');
            }
          } catch (error) {
            clearInterval(pollInterval);
          }
        }, 2000);
      } else {
        // Regular execution via socket or API
        if (socket) {
          socket.emit('run:request', {
            roomId,
            projectId,
            language,
            code,
            stdin,
          });
        } else {
          await api.post(`/runs/${projectId}`, {
            language,
            code,
            stdin,
          });
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to run code');
      addOutput(`Error: ${error.response?.data?.error?.message || 'Failed to run code'}\n`, 'error');
      addOutput(`${getPrompt()}`, 'prompt');
    }
  };

  const clearTerminal = () => {
    setRuns([]);
    addOutput(`${getPrompt()}`, 'prompt');
  };

  const copyOutput = () => {
    const output = runs.map(r => r.output || r.error || '').join('\n');
    navigator.clipboard.writeText(output);
    toast.success('Output copied to clipboard');
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3e3e3e]">
        <div className="flex items-center space-x-3">
          <TerminalIcon className="w-4 h-4 text-[#858585]" />
          <span className="text-[#858585] text-xs">TERMINAL</span>
          <div className="h-4 w-px bg-[#3e3e3e]" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-2 py-1 bg-[#1e1e1e] text-[#d4d4d4] border border-[#3e3e3e] rounded text-xs focus:outline-none focus:border-[#007acc]"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="php">PHP</option>
            <option value="ruby">Ruby</option>
            <option value="swift">Swift</option>
            <option value="kotlin">Kotlin</option>
            <option value="dart">Dart</option>
            <option value="r">R</option>
            <option value="scala">Scala</option>
            <option value="bash">Bash</option>
            <option value="powershell">PowerShell</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={copyOutput}
            className="p-1.5 hover:bg-[#3e3e3e] rounded text-[#858585] hover:text-[#d4d4d4]"
            title="Copy Output"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={clearTerminal}
            className="p-1.5 hover:bg-[#3e3e3e] rounded text-[#858585] hover:text-[#d4d4d4]"
            title="Clear Terminal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className="px-2 py-1 text-xs bg-[#007acc] text-white rounded hover:bg-[#005a9e]"
          >
            {showCodeEditor ? 'Hide Editor' : 'Show Editor'}
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm"
        style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
      >
        {runs.length === 0 && (
          <div className="text-[#858585]">
            <div>CodeCompute Hub Terminal v1.0.0</div>
            <div>Type 'help' for available commands.</div>
            <div className="mt-2">{getPrompt()}</div>
          </div>
        )}
        {runs.map((run, index) => (
          <div key={run.id} className="whitespace-pre-wrap">
            {run.output && (
              <div className="text-[#d4d4d4]">{run.output}</div>
            )}
            {run.error && (
              <div className="text-[#f48771]">{run.error}</div>
            )}
            {!run.output && !run.error && index === runs.length - 1 && (
              <div className="text-[#858585]">{getPrompt()}</div>
            )}
          </div>
        ))}
        <div ref={outputEndRef} />
      </div>

      {/* Command Input */}
      <div className="border-t border-[#3e3e3e] bg-[#252526] px-4 py-2">
        <div className="flex items-center">
          <span className="text-[#858585] mr-2">{getPrompt()}</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-[#d4d4d4] outline-none"
            placeholder="Enter command..."
            autoFocus
          />
        </div>
      </div>

      {/* Code Editor Section */}
      {showCodeEditor && (
        <div className="border-t border-[#3e3e3e] bg-[#1e1e1e]">
          <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3e3e3e]">
            <span className="text-xs text-[#858585]">CODE EDITOR</span>
            <button
              onClick={handleRun}
              disabled={isRunning || !code.trim()}
              className="px-3 py-1 text-xs bg-[#007acc] text-white rounded hover:bg-[#005a9e] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Run Code
                </>
              )}
            </button>
          </div>
          <div className="p-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#858585] mb-1 block">Execution Mode:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setResourceType('CPU')}
                  className={`px-2 py-1 text-xs rounded ${
                    resourceType === 'CPU'
                      ? 'bg-[#007acc] text-white'
                      : 'bg-[#2d2d2d] text-[#858585] hover:bg-[#3e3e3e]'
                  }`}
                >
                  CPU (Free)
                </button>
                <button
                  onClick={() => setResourceType('GPU')}
                  className={`px-2 py-1 text-xs rounded ${
                    resourceType === 'GPU'
                      ? 'bg-[#007acc] text-white'
                      : 'bg-[#2d2d2d] text-[#858585] hover:bg-[#3e3e3e]'
                  }`}
                >
                  GPU (Credits)
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#858585] mb-1 block">Input (stdin):</label>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                className="w-full px-2 py-1 bg-[#252526] text-[#d4d4d4] border border-[#3e3e3e] rounded font-mono text-xs focus:outline-none focus:border-[#007acc]"
                rows={2}
                placeholder="Enter input..."
              />
            </div>
            <div>
              <label className="text-xs text-[#858585] mb-1 block">Code:</label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-2 py-1 bg-[#252526] text-[#d4d4d4] border border-[#3e3e3e] rounded font-mono text-xs focus:outline-none focus:border-[#007acc]"
                rows={8}
                placeholder={`Write your ${language} code here...`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
