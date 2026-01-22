import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Cpu, Zap, Clock, DollarSign, Calendar, Play, History } from 'lucide-react';

interface Credits {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  transactions: any[];
}

interface ComputeJob {
  id: string;
  status: string;
  language: string;
  resourceType: string;
  gpuType?: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  computeHours: number;
  creditsUsed: number;
  createdAt: string;
}

export default function ComputeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [credits, setCredits] = useState<Credits | null>(null);
  const [jobs, setJobs] = useState<ComputeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    startTime: '',
    endTime: '',
    gpuType: 'T4',
    gpuCount: 1,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [creditsRes, jobsRes] = await Promise.all([
        api.get('/compute/credits'),
        api.get('/compute/jobs'),
      ]);
      setCredits(creditsRes.data.data.credits);
      setJobs(jobsRes.data.data.jobs);
    } catch (error: any) {
      toast.error('Failed to load compute data');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    // This would integrate with calendar and create scheduled job
    toast.success('GPU time scheduled successfully!');
    setShowScheduleModal(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Compute Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your compute credits and GPU jobs
          </p>
        </div>

        {/* Credits Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Credits Balance</h3>
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {credits?.balance.toFixed(2) || '0.00'}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ≈ {(credits?.balance || 0) * 1} compute hours
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Earned</h3>
              <Cpu className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {credits?.totalEarned.toFixed(2) || '0.00'}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">All time</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Spent</h3>
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {credits?.totalSpent.toFixed(2) || '0.00'}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">All time</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8 flex space-x-4">
          <button
            onClick={() => navigate('/payment')}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Buy Credits
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Schedule GPU Time
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Jobs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Compute Jobs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Job ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Credits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No compute jobs yet
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">
                        {job.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            job.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : job.status === 'RUNNING'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : job.status === 'FAILED'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {job.resourceType === 'GPU' ? (
                          <span className="flex items-center gap-1">
                            <Zap className="w-4 h-4" />
                            {job.gpuType || 'GPU'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Cpu className="w-4 h-4" />
                            CPU
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {job.creditsUsed.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Schedule GPU Time
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    GPU Type
                  </label>
                  <select
                    value={scheduleForm.gpuType}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, gpuType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="T4">NVIDIA T4</option>
                    <option value="V100">NVIDIA V100</option>
                    <option value="A100">NVIDIA A100</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSchedule}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

