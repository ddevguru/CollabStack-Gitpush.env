import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
  label?: string;
  icon?: React.ReactNode;
}

export const FloatingActionButton = ({
  onClick,
  label = 'New Project',
  icon = <Plus className="w-6 h-6" />,
}: FloatingActionButtonProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-collab rounded-full shadow-lg flex items-center justify-center text-white z-50 hover:shadow-xl transition-shadow"
      title={label}
    >
      {icon}
    </motion.button>
  );
};

