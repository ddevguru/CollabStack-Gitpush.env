import { motion } from 'framer-motion';
import { useSessionStore, CURSOR_COLORS } from '../../stores/sessionStore';

interface LiveCursorsProps {
  editorRef: any;
}

export const LiveCursors = ({ editorRef }: LiveCursorsProps) => {
  const cursors = useSessionStore((state) => state.cursors);

  if (!editorRef?.current || cursors.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {cursors.map((cursor) => {
        const color = CURSOR_COLORS[cursor.userId.charCodeAt(0) % CURSOR_COLORS.length];
        
        return (
          <motion.div
            key={cursor.userId}
            className="absolute"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              left: `${cursor.position.column * 8}px`,
              top: `${cursor.position.line * 20}px`,
            }}
          >
            <div className="relative">
              <div
                className="w-0.5 h-5 absolute"
                style={{ backgroundColor: color }}
              />
              <div
                className="absolute -top-6 left-0 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                style={{ backgroundColor: color }}
              >
                {cursor.userName}
              </div>
              <motion.div
                className="absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-white"
                style={{ backgroundColor: color }}
                animate={{
                  boxShadow: [
                    `0 0 0 0 rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.7)`,
                    `0 0 0 8px rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0)`,
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

