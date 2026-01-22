import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, Calendar, Clock, Users, Zap, X } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface GoogleMeetSchedulerProps {
  projectId?: string;
  teamId?: string;
  onClose?: () => void;
}

export const GoogleMeetScheduler = ({ projectId, teamId, onClose }: GoogleMeetSchedulerProps) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'schedule'>('quick');
  const [loading, setLoading] = useState(false);
  const [scheduledMeetings, setScheduledMeetings] = useState<any[]>([]);
  
  // Schedule form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [attendeeEmail, setAttendeeEmail] = useState('');

  const handleQuickMeet = async () => {
    setLoading(true);
    try {
      const response = await api.post('/meet/quick', {
        projectId,
        teamId,
      });
      
      if (response.data.success) {
        const { meetUrl } = response.data.data;
        window.open(meetUrl, '_blank');
        toast.success('Google Meet created! Opening in new tab...');
        onClose?.();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create quick meet');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleMeet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(`${date}T${time}`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const response = await api.post('/meet/schedule', {
        title,
        description,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        attendees,
        projectId,
        teamId,
      });

      if (response.data.success) {
        toast.success('Meeting scheduled successfully!');
        setTitle('');
        setDescription('');
        setDate('');
        setTime('');
        setDuration(30);
        setAttendees([]);
        setAttendeeEmail('');
        loadScheduledMeetings();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  const loadScheduledMeetings = async () => {
    try {
      const response = await api.get('/meet/scheduled', {
        params: { projectId, teamId },
      });
      if (response.data.success) {
        setScheduledMeetings(response.data.data.meetings || []);
      }
    } catch (error) {
      // Ignore
    }
  };

  const addAttendee = () => {
    if (attendeeEmail && !attendees.includes(attendeeEmail)) {
      setAttendees([...attendees, attendeeEmail]);
      setAttendeeEmail('');
    }
  };

  const removeAttendee = (email: string) => {
    setAttendees(attendees.filter(e => e !== email));
  };

  useEffect(() => {
    if (activeTab === 'schedule') {
      loadScheduledMeetings();
    }
  }, [activeTab]);

  return (
    <div className="bg-dark-surface/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-2xl p-6 shadow-2xl max-w-2xl w-full">
      {onClose && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-collab-400 to-pink-400 bg-clip-text text-transparent">
            Google Meet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700/50">
        <button
          onClick={() => setActiveTab('quick')}
          className={`flex-1 py-3 px-4 font-semibold transition-all ${
            activeTab === 'quick'
              ? 'text-collab-400 border-b-2 border-collab-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            Quick Meet
          </div>
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-3 px-4 font-semibold transition-all ${
            activeTab === 'schedule'
              ? 'text-collab-400 border-b-2 border-collab-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Meet
          </div>
        </button>
      </div>

      {/* Quick Meet Tab */}
      {activeTab === 'quick' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <Video className="w-16 h-16 mx-auto mb-4 text-collab-400" />
            <h3 className="text-xl font-bold mb-2">Start Instant Meeting</h3>
            <p className="text-gray-400">
              Create a Google Meet link instantly and start collaborating right away
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleQuickMeet}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-collab-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Start Quick Meet'}
          </motion.button>
        </motion.div>
      )}

      {/* Schedule Meet Tab */}
      {activeTab === 'schedule' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <form onSubmit={handleScheduleMeet} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Meeting Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-collab-500"
                placeholder="e.g., Team Standup"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-collab-500"
                placeholder="Meeting agenda, topics to discuss..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-collab-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  Time *
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-collab-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Duration (minutes)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-collab-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Attendees
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
                  placeholder="email@example.com"
                  className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-collab-500"
                />
                <button
                  type="button"
                  onClick={addAttendee}
                  className="px-4 py-2 bg-collab-500 text-white rounded-lg hover:bg-collab-600 transition-colors"
                >
                  Add
                </button>
              </div>
              {attendees.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attendees.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-700 rounded-full text-sm"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeAttendee(email)}
                        className="hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-collab-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Scheduling...' : 'Schedule Meeting'}
            </motion.button>
          </form>

          {/* Scheduled Meetings List */}
          {scheduledMeetings.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700/50">
              <h4 className="font-semibold mb-4 text-gray-300">Upcoming Meetings</h4>
              <div className="space-y-3">
                {scheduledMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-semibold text-white">{meeting.title}</h5>
                        <p className="text-sm text-gray-400 mt-1">
                          {new Date(meeting.startTime).toLocaleString()}
                        </p>
                      </div>
                      <a
                        href={meeting.meetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-collab-500 text-white rounded-lg hover:bg-collab-600 transition-colors text-sm"
                      >
                        Join
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

