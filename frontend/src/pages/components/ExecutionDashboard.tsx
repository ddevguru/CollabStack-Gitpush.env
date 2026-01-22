import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Zap, MapPin, Clock, Activity, TrendingUp } from 'lucide-react';
import { getSocket } from '@/services/socket';

interface ExecutionDashboardProps {
  projectId: string;
  roomId: string;
  runId?: string;
}

interface ExecutionMetrics {
  gpuUsage: number;
  memoryUsage: number;
  cpuUsage: number;
  region: string;
  cluster: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  executionTime?: number;
}

export default function ExecutionDashboard({ projectId, roomId, runId }: ExecutionDashboardProps) {
  const [metrics, setMetrics] = useState<ExecutionMetrics>({
    gpuUsage: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    region: 'Selecting...',
    cluster: 'Initializing...',
    status: 'pending',
  });
  const [showDashboard, setShowDashboard] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    if (!socket || !runId) return;

    const handleRunStarted = (data: { runId: string; region?: string; cluster?: string }) => {
      if (data.runId === runId) {
        setShowDashboard(true);
        setMetrics((prev) => ({
          ...prev,
          status: 'running',
          region: data.region || 'Mumbai Cloud',
          cluster: data.cluster || 'GPU Cluster #1',
          startTime: new Date(),
        }));

        // Simulate GPU usage increase
        let gpuUsage = 5;
        const interval = setInterval(() => {
          gpuUsage = Math.min(95, gpuUsage + Math.random() * 10);
          setMetrics((prev) => ({
            ...prev,
            gpuUsage: Math.round(gpuUsage),
            memoryUsage: Math.round(gpuUsage * 0.8),
            cpuUsage: Math.round(gpuUsage * 0.3),
          }));
        }, 500);

        // Stop after 10 seconds (simulation)
        setTimeout(() => {
          clearInterval(interval);
          setMetrics((prev) => ({
            ...prev,
            status: 'completed',
            gpuUsage: 0,
            memoryUsage: 0,
            cpuUsage: 0,
          }));
        }, 10000);
      }
    };

    const handleRunCompleted = (data: { runId: string }) => {
      if (data.runId === runId) {
        setMetrics((prev) => ({
          ...prev,
          status: 'completed',
          gpuUsage: 0,
          memoryUsage: 0,
          cpuUsage: 0,
        }));
      }
    };

    socket.on('run:started', handleRunStarted);
    socket.on('run:completed', handleRunCompleted);

    return () => {
      socket.off('run:started', handleRunStarted);
      socket.off('run:completed', handleRunCompleted);
    };
  }, [socket, runId]);

  if (!showDashboard && metrics.status === 'pending') {
    return null;
  }

  return (
    <AnimatePresence>
      {showDashboard && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4 mb-4 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-collab-400" />
              <h3 className="text-lg font-bold text-white">Live Execution Dashboard</h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              metrics.status === 'running' ? 'bg-green-500/20 text-green-400' :
              metrics.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {metrics.status.toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Region Info */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-collab-400" />
                <span className="text-xs text-gray-400">Region</span>
              </div>
              <p className="text-sm font-semibold text-white">{metrics.region}</p>
              <p className="text-xs text-gray-500 mt-1">{metrics.cluster}</p>
            </motion.div>

            {/* GPU Usage */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-400">GPU Usage</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-yellow-400">{metrics.gpuUsage}%</p>
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.gpuUsage}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600"
                />
              </div>
            </motion.div>

            {/* Memory Usage */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">Memory</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-blue-400">{metrics.memoryUsage}%</p>
              </div>
              <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.memoryUsage}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                />
              </div>
            </motion.div>
          </div>

          {/* Visual Map */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Cluster Status</span>
              {metrics.status === 'running' && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Active</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((node) => (
                <motion.div
                  key={node}
                  initial={{ opacity: 0.3 }}
                  animate={{ 
                    opacity: metrics.status === 'running' && node === 1 ? 1 : 0.3,
                    scale: metrics.status === 'running' && node === 1 ? 1.1 : 1
                  }}
                  className={`h-12 rounded-lg border-2 ${
                    metrics.status === 'running' && node === 1
                      ? 'bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-400'
                      : 'bg-gray-700/30 border-gray-600'
                  } flex items-center justify-center`}
                >
                  <Cpu className={`w-5 h-5 ${
                    metrics.status === 'running' && node === 1 ? 'text-green-400' : 'text-gray-500'
                  }`} />
                </motion.div>
              ))}
            </div>
          </div>

          {metrics.status === 'running' && metrics.startTime && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>Execution started at {metrics.startTime.toLocaleTimeString()}</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

