import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Video, Clock, Plus, X } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  meetUrl?: string;
  attendees?: string[];
  type?: 'meeting' | 'marking' | 'reminder';
  note?: string;
}

interface CalendarProps {
  projectId?: string;
  teamId?: string;
}

export const Calendar = ({ projectId, teamId }: CalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reminderText, setReminderText] = useState('');
  const [reminderType, setReminderType] = useState<'marking' | 'reminder'>('reminder');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    loadEvents();
  }, [currentDate, projectId, teamId]);

  const loadEvents = async () => {
    try {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

      const response = await api.get('/meet/calendar', {
        params: {
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString(),
          projectId,
          teamId,
        },
      });

      if (response.data.success) {
        setEvents(response.data.data.events || []);
      }
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    }
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.startTime).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };

  const handleDoubleClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddModal(true);
    setReminderText('');
    setReminderType('reminder');
  };

  const handleAddReminder = async () => {
    if (!selectedDate) return;

    try {
      if (reminderType === 'marking') {
        await api.post('/meet/calendar/mark', {
          date: selectedDate.toISOString(),
          projectId,
          teamId,
          type: 'marking',
        });
        toast.success('Date marked successfully');
      } else {
        // Add reminder with text
        const startTime = new Date(selectedDate);
        startTime.setHours(9, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(10, 0, 0, 0);

        await api.post('/meet/calendar/mark', {
          date: selectedDate.toISOString(),
          projectId,
          teamId,
          type: 'reminder',
          title: reminderText || 'Reminder',
          note: reminderText,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });
        toast.success('Reminder added successfully');
      }
      setShowAddModal(false);
      setReminderText('');
      loadEvents();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to add reminder';
      if (errorMessage.includes('Google account not connected') || errorMessage.includes('Google token')) {
        toast.error('Please connect your Google account in Settings to use calendar features');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleUnmarkDate = async (date: Date) => {
    try {
      await api.delete('/meet/calendar/mark', {
        params: {
          date: date.toISOString(),
          projectId,
          teamId,
        },
      });
      toast.success('Marking removed');
      loadEvents();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to remove marking';
      if (errorMessage.includes('Google account not connected') || errorMessage.includes('Google token')) {
        toast.error('Please connect your Google account in Settings');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const isCurrentDay = isToday(day);
      const isSelectedDay = isSelected(day);
      const hasMarking = dayEvents.some(e => e.type === 'marking' || e.title === 'Marked');
      const hasReminder = dayEvents.some(e => e.type === 'reminder');

      days.push(
        <motion.button
          key={day}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSelectedDate(date)}
          onDoubleClick={() => handleDoubleClick(date)}
          className={`aspect-square p-2 rounded-lg border-2 transition-all relative ${
            isCurrentDay
              ? 'bg-collab-500/20 border-collab-400 text-collab-400'
              : isSelectedDay
              ? 'bg-pink-500/20 border-pink-400 text-pink-400'
              : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
          }`}
          title="Double-click to add reminder/mark"
        >
          <div className="text-sm font-semibold">{day}</div>
          {dayEvents.length > 0 && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
              {hasMarking && (
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" title="Marked" />
              )}
              {hasReminder && (
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" title="Reminder" />
              )}
              {dayEvents.filter(e => e.type === 'meeting').length > 0 && (
                <div className="w-1.5 h-1.5 bg-collab-400 rounded-full" title="Meeting" />
              )}
            </div>
          )}
        </motion.button>
      );
    }

    return days;
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="bg-dark-surface/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <CalendarIcon className="w-6 h-6 text-collab-400" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-collab-400 to-pink-400 bg-clip-text text-transparent">
            {monthNames[month]} {year}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goToPreviousMonth}
            className="p-2 bg-gray-800/50 rounded-lg hover:bg-gray-700 transition-colors text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goToToday}
            className="px-4 py-2 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 transition-all text-sm font-semibold"
          >
            Today
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goToNextMonth}
            className="p-2 bg-gray-800/50 rounded-lg hover:bg-gray-700 transition-colors text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="mb-6">
        {/* Day Names */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-gray-700/50 pt-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            <button
              onClick={() => handleDoubleClick(selectedDate)}
              className="p-2 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 transition-all"
              title="Add Reminder/Mark"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {selectedDateEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedDateEvents.map((event) => (
                <motion.div
                  key={event.id}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {event.type === 'meeting' ? (
                          <Video className="w-4 h-4 text-collab-400" />
                        ) : event.type === 'reminder' ? (
                          <Clock className="w-4 h-4 text-blue-400" />
                        ) : (
                          <CalendarIcon className="w-4 h-4 text-yellow-400" />
                        )}
                        <h4 className="font-semibold text-white">{event.title}</h4>
                      </div>
                      {event.note && (
                        <p className="text-sm text-gray-300 mb-2">{event.note}</p>
                      )}
                      {event.startTime && (
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.startTime).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                            {event.endTime && (
                              <> - {new Date(event.endTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}</>
                            )}
                          </div>
                        </div>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    {event.meetUrl && (
                      <a
                        href={event.meetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 transition-all text-sm font-semibold"
                      >
                        Join
                      </a>
                    )}
                    {(event.type === 'marking' || event.type === 'reminder') && (
                      <button
                        onClick={() => handleUnmarkDate(selectedDate)}
                        className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No events for this day. Double-click to add a reminder or mark.</p>
          )}
        </motion.div>
      )}

      {/* Add Reminder/Mark Modal */}
      {showAddModal && selectedDate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-surface/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Add Reminder/Mark</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setReminderText('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReminderType('reminder')}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                      reminderType === 'reminder'
                        ? 'bg-gradient-to-r from-collab-500 to-pink-500 text-white shadow-lg shadow-collab-500/50'
                        : 'bg-gray-800/50 text-gray-300 border border-gray-700/50'
                    }`}
                  >
                    Reminder
                  </button>
                  <button
                    onClick={() => setReminderType('marking')}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                      reminderType === 'marking'
                        ? 'bg-gradient-to-r from-collab-500 to-pink-500 text-white shadow-lg shadow-collab-500/50'
                        : 'bg-gray-800/50 text-gray-300 border border-gray-700/50'
                    }`}
                  >
                    Mark
                  </button>
                </div>
              </div>

              {reminderType === 'reminder' && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Reminder Text</label>
                  <textarea
                    value={reminderText}
                    onChange={(e) => setReminderText(e.target.value)}
                    placeholder="Enter reminder text..."
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-collab-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setReminderText('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddReminder}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 transition-all font-semibold"
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
