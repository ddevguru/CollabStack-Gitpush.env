import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore, CURSOR_COLORS } from '../../stores/sessionStore';
import * as monaco from 'monaco-editor';

interface LiveCursorsProps {
  editorRef: any;
}

export const LiveCursors = ({ editorRef }: LiveCursorsProps) => {
  const cursors = useSessionStore((state) => state.cursors);
  const [cursorPositions, setCursorPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (!editorRef?.current || cursors.length === 0) return;

    const editor = editorRef.current;
    const updatePositions = () => {
      const positions = new Map<string, { x: number; y: number }>();
      
      cursors.forEach((cursor) => {
        try {
          // Convert Monaco editor coordinates to pixel coordinates
          const position = new monaco.Position(cursor.position.line, cursor.position.column);
          const coords = editor.getScrolledVisiblePosition(position);
          
          if (coords) {
            const layoutInfo = editor.getLayoutInfo();
            const x = coords.left + layoutInfo.contentLeft;
            const y = coords.top + layoutInfo.contentTop;
            positions.set(cursor.userId, { x, y });
          }
        } catch (error) {
          // Fallback to approximate positioning
          const fontSize = editor.getOption(monaco.editor.EditorOption.fontSize) || 14;
          const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight) || fontSize * 1.5;
          const x = cursor.position.column * (fontSize * 0.6);
          const y = (cursor.position.line - 1) * lineHeight;
          positions.set(cursor.userId, { x, y });
        }
      });
      
      setCursorPositions(positions);
    };

    updatePositions();
    
    // Update positions on scroll and resize
    const disposables = [
      editor.onDidScrollChange(updatePositions),
      editor.onDidChangeLayout(updatePositions),
    ];

    // Update periodically to catch cursor movements
    const interval = setInterval(updatePositions, 100);

    return () => {
      disposables.forEach(d => d.dispose());
      clearInterval(interval);
    };
  }, [editorRef, cursors]);

  if (!editorRef?.current || cursors.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {cursors.map((cursor) => {
        const color = CURSOR_COLORS[cursor.userId.charCodeAt(0) % CURSOR_COLORS.length];
        const position = cursorPositions.get(cursor.userId);
        
        if (!position) return null;
        
        return (
          <motion.div
            key={cursor.userId}
            className="absolute"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: position.x,
              y: position.y,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              x: { type: 'spring', stiffness: 500, damping: 30 },
              y: { type: 'spring', stiffness: 500, damping: 30 },
            }}
          >
            <div className="relative">
              <div
                className="w-0.5 h-5 absolute"
                style={{ backgroundColor: color }}
              />
              <div
                className="absolute -top-10 left-0 px-2 py-1 rounded text-xs text-white whitespace-nowrap shadow-lg max-w-[200px]"
                style={{ backgroundColor: color }}
              >
                <div className="font-semibold truncate">{cursor.userName}</div>
                {cursor.filePath && (
                  <div className="text-[10px] opacity-90 truncate" title={cursor.filePath}>
                    📄 {cursor.filePath.split('/').pop() || cursor.filePath}
                  </div>
                )}
                {cursor.position && (
                  <div className="text-[10px] opacity-90">
                    Line {cursor.position.line}, Col {cursor.position.column}
                  </div>
                )}
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

