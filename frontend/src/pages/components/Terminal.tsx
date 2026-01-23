import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/services/socket';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Play, Trash2, Copy, Plus, X } from 'lucide-react';

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

interface TerminalTab {
  id: string;
  name: string;
  runs: Run[];
  commandHistory: string[];
  currentCommand: string;
  isRunning: boolean;
  historyIndex: number;
}

export default function Terminal({ projectId, roomId }: TerminalProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: '1', name: 'Terminal 1', runs: [], commandHistory: [], currentCommand: '', isRunning: false, historyIndex: -1 }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(true);
  const [resourceType, setResourceType] = useState<'CPU' | 'GPU'>('CPU');
  const socket = getSocket();
  const outputEndRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const terminalRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const runs = activeTab.runs;
  const commandHistory = activeTab.commandHistory;
  const currentCommand = activeTab.currentCommand;
  const isRunning = activeTab.isRunning;
  const historyIndex = activeTab.historyIndex;

  const updateTab = (tabId: string, updates: Partial<TerminalTab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, ...updates } : tab
    ));
  };

  const createNewTab = () => {
    const newTabId = `${Date.now()}`;
    const newTab: TerminalTab = {
      id: newTabId,
      name: `Terminal ${tabs.length + 1}`,
      runs: [],
      commandHistory: [],
      currentCommand: '',
      isRunning: false,
      historyIndex: -1,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) {
      toast.error('Cannot close the last terminal tab');
      return;
    }
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    if (activeTabId === tabId) {
      const remainingTabs = tabs.filter(tab => tab.id !== tabId);
      setActiveTabId(remainingTabs[0]?.id || '1');
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleRunStarted = (data: any) => {
      updateTab(activeTabId, { isRunning: true });
      addOutput(`[${new Date().toLocaleTimeString()}] Running ${data.language} code...\n`, 'info');
    };

    const handleRunCompleted = (data: { run: Run }) => {
      updateTab(activeTabId, { isRunning: false });
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
  }, [socket, projectId, activeTabId]);

  useEffect(() => {
    const ref = outputEndRefs.current.get(activeTabId);
    ref?.scrollIntoView({ behavior: 'smooth' });
  }, [runs, activeTabId]);

  useEffect(() => {
    const ref = inputRefs.current.get(activeTabId);
    if (ref) {
      ref.focus();
    }
  }, [activeTabId]);

  const getPrompt = () => {
    return `$ `;
  };

  const addOutput = (text: string, type: 'output' | 'error' | 'info' | 'prompt' = 'output', tabId?: string) => {
    const targetTabId = tabId || activeTabId;
    const newRun: Run = {
      id: `${Date.now()}-${Math.random()}`,
      language,
      code: '',
      status: type === 'error' ? 'ERROR' : type === 'info' ? 'INFO' : 'SUCCESS',
      output: type === 'output' || type === 'info' || type === 'prompt' ? text : undefined,
      error: type === 'error' ? text : undefined,
      createdAt: new Date().toISOString(),
    };
    updateTab(targetTabId, { runs: [...tabs.find(t => t.id === targetTabId)!.runs, newRun] });
    setTimeout(() => {
      const ref = outputEndRefs.current.get(targetTabId);
      ref?.scrollIntoView({ behavior: 'smooth' });
    }, 10);
  };

  const handleCommand = async (command: string) => {
    if (!command.trim()) {
      addOutput(`${getPrompt()}`, 'prompt');
      return;
    }

    addOutput(`${getPrompt()}${command}\n`, 'prompt');
    updateTab(activeTabId, {
      commandHistory: [...commandHistory, command],
      currentCommand: '',
      historyIndex: -1,
    });

    const parts = command.trim().split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case 'clear':
      case 'cls':
        updateTab(activeTabId, { runs: [] });
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
  lang <name>   - Set language
  code          - Show current code
  history       - Show command history
  gpu           - Switch to GPU execution
  cpu           - Switch to CPU execution
  credits       - Show compute credits balance
  npm, yarn, pip, node, python - Execute package manager/runtime commands
  help          - Show this help message
`, 'info');
        addOutput(`${getPrompt()}`, 'prompt');
        break;
      case 'gpu':
        setResourceType('GPU');
        addOutput('Switched to GPU execution mode\n', 'info');
        addOutput(`${getPrompt()}`, 'prompt');
        break;
      case 'cpu':
        setResourceType('CPU');
        addOutput('Switched to CPU execution mode\n', 'info');
        addOutput(`${getPrompt()}`, 'prompt');
        break;
      case 'credits':
        try {
          const creditsRes = await api.get('/compute/credits');
          const credits = creditsRes.data.data.credits;
          addOutput(`\nCompute Credits Balance: ${credits.balance.toFixed(2)}\n`, 'info');
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
      case 'npm':
      case 'yarn':
      case 'pnpm':
      case 'pip':
      case 'pip3':
      case 'python':
      case 'node':
      case 'python3':
        await handlePackageCommand(command);
        break;
      default:
        addOutput(`Command not found: ${cmd}. Type 'help' for available commands.\n`, 'error');
        addOutput(`${getPrompt()}`, 'prompt');
    }
  };

  const handlePackageCommand = async (command: string) => {
    // Check if current tab is busy
    if (isRunning) {
      // Create new tab if current is busy
      createNewTab();
      const newTabId = `${Date.now()}`;
      addOutput(`Previous command is running. Opening new terminal...\n`, 'info', newTabId);
      addOutput(`Executing: ${command}\n`, 'info', newTabId);
      updateTab(newTabId, { isRunning: true });
      await executeCommandInTab(command, newTabId);
      return;
    }

    updateTab(activeTabId, { isRunning: true });
    addOutput(`Executing: ${command}\n`, 'info');
    await executeCommandInTab(command, activeTabId);
  };

  const executeCommandInTab = async (command: string, tabId: string) => {
    try {
      const response = await api.post(`/projects/${projectId}/execute`, {
        command: command.trim(),
      });
      
      if (response.data.success) {
        const output = response.data.data.output || '';
        const error = response.data.data.error || '';
        
        if (output) {
          addOutput(output, 'output', tabId);
        }
        if (error) {
          addOutput(error, 'error', tabId);
        }
      } else {
        addOutput(`Failed to execute command\n`, 'error', tabId);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message || 'Failed to execute command';
      addOutput(`Error: ${errorMsg}\n`, 'error', tabId);
    } finally {
      updateTab(tabId, { isRunning: false });
    }
    addOutput(`${getPrompt()}`, 'prompt', tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommand(currentCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        updateTab(activeTabId, {
          historyIndex: newIndex,
          currentCommand: commandHistory[newIndex],
        });
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          updateTab(activeTabId, {
            historyIndex: -1,
            currentCommand: '',
          });
        } else {
          updateTab(activeTabId, {
            historyIndex: newIndex,
            currentCommand: commandHistory[newIndex],
          });
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
      const useGPU = resourceType === 'GPU';
      
      if (useGPU) {
        const jobResponse = await api.post('/compute/jobs', {
          projectId,
          language,
          code,
          resourceType: 'GPU',
          gpuType: 'T4',
        });
        
        const job = jobResponse.data.data.job;
        addOutput(`\n[Compute] Job ${job.id.substring(0, 8)} created\n`, 'info');
        
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await api.get(`/compute/jobs/${job.id}`);
            const updatedJob = statusResponse.data.data.job;
            
            if (updatedJob.status === 'COMPLETED') {
              clearInterval(pollInterval);
              if (updatedJob.output) addOutput(updatedJob.output, 'output');
              if (updatedJob.error) addOutput(updatedJob.error, 'error');
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
    updateTab(activeTabId, { runs: [] });
    addOutput(`${getPrompt()}`, 'prompt');
  };

  const copyOutput = () => {
    const output = runs.map(r => r.output || r.error || '').join('\n');
    navigator.clipboard.writeText(output);
    toast.success('Output copied to clipboard');
  };

  return (
    <div className="flex flex-col h-full bg-black text-green-400 font-mono text-sm">
      {/* Terminal Tabs */}
      <div className="flex items-center gap-1 px-2 py-1 bg-gray-900 border-b border-gray-800 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-1 px-3 py-1 rounded-t cursor-pointer border-b-2 transition-colors ${
              activeTabId === tab.id
                ? 'bg-black border-green-500 text-green-400'
                : 'bg-gray-800 border-transparent text-gray-500 hover:text-gray-300'
            }`}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span className="text-xs whitespace-nowrap">{tab.name}</span>
            {tab.isRunning && (
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="ml-1 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={createNewTab}
          className="px-2 py-1 text-gray-500 hover:text-green-400 hover:bg-gray-800 rounded"
          title="New Terminal"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <span className="text-green-400 text-xs font-semibold">
            &gt;_ TERMINAL
          </span>
          <div className="h-4 w-px bg-gray-700" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-2 py-1 bg-gray-800 text-green-400 border border-gray-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
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
            className="p-1.5 hover:bg-gray-800 rounded text-gray-500 hover:text-green-400"
            title="Copy Output"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearTerminal}
            className="p-1.5 hover:bg-gray-800 rounded text-gray-500 hover:text-red-400"
            title="Clear Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className="px-2 py-1 text-xs bg-gray-800 text-green-400 rounded border border-gray-700 hover:bg-gray-700"
          >
            {showCodeEditor ? 'Hide Editor' : 'Show Editor'}
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm bg-black"
        style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
      >
        {runs.length === 0 && (
          <div className="text-gray-500">
            <div>Type 'help' for available commands.</div>
            <div className="mt-2 text-green-400">{getPrompt()}</div>
          </div>
        )}
        {runs.map((run, index) => (
          <div key={`${run.id}-${index}`} className="whitespace-pre-wrap break-words">
            {run.output && (
              <div className="text-green-400">{run.output}</div>
            )}
            {run.error && (
              <div className="text-red-500">{run.error}</div>
            )}
            {!run.output && !run.error && run.status && (
              <div className={`text-xs ${
                run.status === 'SUCCESS' ? 'text-green-400' :
                run.status === 'ERROR' ? 'text-red-500' :
                'text-yellow-500'
              }`}>
                [{run.status}]
              </div>
            )}
          </div>
        ))}
        <div className="text-green-400 mt-2">{getPrompt()}</div>
        <div 
          ref={(el) => {
            if (el) outputEndRefs.current.set(activeTabId, el);
          }} 
        />
      </div>

      {/* Command Input */}
      <div className="border-t border-gray-800 bg-gray-900 px-4 py-2">
        <div className="flex items-center">
          <span className="text-green-400 mr-2">$</span>
          <input
            ref={(el) => {
              if (el) inputRefs.current.set(activeTabId, el);
            }}
            type="text"
            value={currentCommand}
            onChange={(e) => updateTab(activeTabId, { currentCommand: e.target.value })}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-green-400 outline-none placeholder-gray-600"
            placeholder={isRunning ? "Command running..." : "Enter command..."}
            disabled={isRunning}
            autoFocus
          />
        </div>
      </div>

      {/* Code Editor Section */}
      {showCodeEditor && (
        <div className="border-t border-gray-800 bg-gray-900">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-800">
            <span className="text-xs text-gray-500">CODE EDITOR</span>
            <button
              onClick={handleRun}
              disabled={isRunning || !code.trim()}
              className="px-3 py-1 text-xs bg-gray-700 text-green-400 rounded border border-gray-600 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-2 w-2 border-b border-green-400"></div>
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
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-500">Execution Mode:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setResourceType('CPU')}
                  className={`px-2 py-1 text-xs rounded border ${
                    resourceType === 'CPU'
                      ? 'bg-gray-700 text-green-400 border-green-500'
                      : 'bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  CPU (Free)
                </button>
                <button
                  onClick={() => setResourceType('GPU')}
                  className={`px-2 py-1 text-xs rounded border ${
                    resourceType === 'GPU'
                      ? 'bg-gray-700 text-green-400 border-green-500'
                      : 'bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  GPU (Credits)
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Input (stdin):</label>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                className="w-full px-2 py-1 bg-black text-green-400 border border-gray-800 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                rows={2}
                placeholder="Enter input..."
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Code:</label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-2 py-1 bg-black text-green-400 border border-gray-800 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
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
