import { motion } from 'framer-motion';
import { Users, Crown, Circle } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';

export const TeamPanel = () => {
  const members = useSessionStore((state) => state.members);

  return (
    <div className="bg-dark-surface rounded-lg border border-gray-800 p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-collab-500" />
        <h3 className="font-semibold text-white">Team ({members.length})</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
          >
            <div className="relative">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-collab flex items-center justify-center text-white font-semibold">
                  {member.name[0].toUpperCase()}
                </div>
              )}
              <Circle
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${
                  member.isOnline ? 'text-emerald-500' : 'text-gray-500'
                }`}
                fill="currentColor"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">
                  {member.name}
                </span>
                {member.role === 'leader' && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-collab"
                    initial={{ width: 0 }}
                    animate={{ width: `${member.contribution}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {member.contribution}%
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

