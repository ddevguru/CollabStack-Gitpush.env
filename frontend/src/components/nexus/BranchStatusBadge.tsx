import { GitBranch, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface BranchStatusBadgeProps {
  branchName: string;
  isActive: boolean;
  ahead: number;
  behind: number;
  onClick?: () => void;
}

export const BranchStatusBadge = ({
  branchName,
  isActive,
  ahead,
  behind,
  onClick,
}: BranchStatusBadgeProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${
        isActive
          ? 'bg-collab-500/20 text-collab-400 border border-collab-500/50'
          : 'bg-gray-800 text-gray-400 border border-gray-700'
      }`}
    >
      <GitBranch className="w-4 h-4" />
      <span>{branchName}</span>
      {ahead > 0 && (
        <span className="flex items-center gap-1 text-emerald-400">
          <ArrowUp className="w-3 h-3" />
          {ahead}
        </span>
      )}
      {behind > 0 && (
        <span className="flex items-center gap-1 text-pink-500">
          <ArrowDown className="w-3 h-3" />
          {behind}
        </span>
      )}
    </motion.button>
  );
};

