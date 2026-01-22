import { useEffect, useState } from 'react';
import api from '@/services/api';
import { Activity, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

interface Metrics {
  totalFiles: number;
  totalLines: number;
  avgComplexity: number;
  avgMaintainability: number;
  avgQuality: number;
  totalIssues: number;
  metrics: any[];
}

interface CodeMetricsProps {
  projectId: string;
}

export default function CodeMetrics({ projectId }: CodeMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [projectId]);

  const loadMetrics = async () => {
    try {
      const response = await api.get(`/metrics/project/${projectId}`);
      setMetrics(response.data.data.metrics);
    } catch (error) {
      console.error('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getQualityBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Loading metrics...
      </div>
    );
  }

  if (!metrics || metrics.totalFiles === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        No code metrics available. Start coding to see metrics!
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Files</span>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.totalFiles}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Lines of Code</span>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.totalLines.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Complexity</span>
            <AlertCircle className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.avgComplexity.toFixed(1)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Quality</span>
            <CheckCircle className="w-4 h-4 text-gray-400" />
          </div>
          <div className={`text-2xl font-bold ${getQualityColor(metrics.avgQuality)}`}>
            {metrics.avgQuality.toFixed(0)}
          </div>
          <div className={`text-xs mt-1 px-2 py-0.5 rounded inline-block ${getQualityBadge(metrics.avgQuality)}`}>
            {metrics.avgQuality >= 80 ? 'Excellent' : metrics.avgQuality >= 60 ? 'Good' : 'Needs Improvement'}
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">File Metrics</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {metrics.metrics.map((metric) => (
            <div key={metric.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-gray-900 dark:text-white">{metric.filePath}</span>
                <span className={`text-sm font-medium ${getQualityColor(metric.codeQuality)}`}>
                  {metric.codeQuality.toFixed(0)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-xs text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-medium">Lines:</span> {metric.linesOfCode}
                </div>
                <div>
                  <span className="font-medium">Complexity:</span> {metric.complexity.toFixed(1)}
                </div>
                <div>
                  <span className="font-medium">Maintainability:</span> {metric.maintainability.toFixed(0)}%
                </div>
                <div>
                  <span className="font-medium">Issues:</span> {(metric.issues as any[]).length}
                </div>
              </div>
              {(metric.issues as any[]).length > 0 && (
                <div className="mt-2 space-y-1">
                  {(metric.issues as any[]).slice(0, 3).map((issue, idx) => (
                    <div
                      key={idx}
                      className={`text-xs px-2 py-1 rounded ${
                        issue.type === 'ERROR'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : issue.type === 'WARNING'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}
                    >
                      Line {issue.line}: {issue.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Issues Summary */}
      {metrics.totalIssues > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="font-semibold text-yellow-900 dark:text-yellow-200">
              {metrics.totalIssues} Issues Found
            </span>
          </div>
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Review the file metrics above to see detailed issues and suggestions.
          </p>
        </div>
      )}
    </div>
  );
}

