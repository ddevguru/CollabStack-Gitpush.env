import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Resizable } from 're-resizable';
import { useUIStore } from '../../stores/uiStore';
import { LiveCursors } from './LiveCursors';

interface EditorLayoutProps {
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  editorRef?: any;
}

export const EditorLayout = ({ leftPane, rightPane, editorRef }: EditorLayoutProps) => {
  const layout = useUIStore((state) => state.layout);
  const [leftWidth, setLeftWidth] = useState(60);

  if (layout === 'editor') {
    return <div className="h-full">{leftPane}</div>;
  }

  if (layout === 'collab') {
    return <div className="h-full">{rightPane}</div>;
  }

  return (
    <div className="flex h-full relative">
      <Resizable
        size={{ width: `${leftWidth}%`, height: '100%' }}
        minWidth="40%"
        maxWidth="80%"
        onResizeStop={(_e, _direction, _ref, d) => {
          const newWidth = (leftWidth * window.innerWidth + d.width) / window.innerWidth * 100;
          setLeftWidth(Math.max(40, Math.min(80, newWidth)));
        }}
        handleClasses={{
          right: 'w-1 hover:bg-collab-500/50 transition-colors cursor-col-resize',
        }}
        className="relative"
      >
        <div className="h-full relative">
          {leftPane}
          {editorRef && <LiveCursors editorRef={editorRef} />}
        </div>
      </Resizable>

      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key="right-pane"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-full"
          >
            {rightPane}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

