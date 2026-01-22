import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { LiveCursors } from '@/components/nexus/LiveCursors';

interface File {
  id: string;
  path: string;
  content: string;
}

interface MonacoEditorProps {
  file: File;
  onSave: (content: string) => void;
  onChange?: (content: string) => void;
  projectId: string;
  roomId: string;
}

export default function MonacoEditor({ file, onSave, onChange, projectId, roomId }: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const { user } = useAuthStore();
  const socket = getSocket();
  const { addCursor, updateCursor, removeCursor } = useSessionStore();

  useEffect(() => {
    if (!socket || !editorRef.current) return;

    const handleCursorUpdate = (data: any) => {
      // Only show cursors for other users on the same file
      if (data.userId === user?.id || data.filePath !== file.path) {
        // Remove cursor if user switched files
        if (data.filePath !== file.path) {
          removeCursor(data.userId);
        }
        return;
      }
      
      // Update cursor in session store
      const cursor = {
        userId: data.userId,
        userName: data.userName || 'Unknown',
        color: '',
        position: data.position,
        fileId: file.id,
      };
      
      // Check if cursor already exists
      const existingCursor = useSessionStore.getState().cursors.find(c => c.userId === data.userId && c.fileId === file.id);
      if (existingCursor) {
        updateCursor(data.userId, data.position);
      } else {
        addCursor(cursor);
      }
    };

    const handleUserLeft = (data: any) => {
      if (data.userId) {
        removeCursor(data.userId);
      }
    };

    const handleEdit = (data: any) => {
      if (data.userId === user?.id || data.fileId !== file.id) return;
      // Apply remote edit
      // This would require Operational Transform implementation
    };

    socket.on('cursor:updated', handleCursorUpdate);
    socket.on('user:left', handleUserLeft);
    socket.on('edit', handleEdit);

    return () => {
      socket.off('cursor:updated', handleCursorUpdate);
      socket.off('user:left', handleUserLeft);
      socket.off('edit', handleEdit);
    };
  }, [socket, file, user, addCursor, updateCursor, removeCursor]);

  // Clean up cursors when file changes
  useEffect(() => {
    const currentCursors = useSessionStore.getState().cursors;
    currentCursors.forEach(cursor => {
      if (cursor.fileId !== file.id) {
        removeCursor(cursor.userId);
      }
    });
  }, [file.id, removeCursor]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Configure editor
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      wordWrap: 'on',
      automaticLayout: true,
    });

    // Configure auto-closing for HTML/XML tags
    const language = getLanguage(file.path);
    if (language === 'html' || language === 'xml') {
      // Add custom action to auto-close HTML tags when typing '>'
      editor.onDidChangeModelContent((e: monaco.editor.IModelContentChangedEvent) => {
        const model = editor.getModel();
        if (!model) return;
        
        const changes = e.changes;
        for (const change of changes) {
          // Check if '>' was just typed
          if (change.text === '>') {
            const position = new monaco.Position(change.range.startLineNumber, change.range.startColumn);
            const line = model.getLineContent(position.lineNumber);
            const beforeCursor = line.substring(0, position.column - 1);
            
            // Match opening tag like <div, <span, etc.
            const tagMatch = beforeCursor.match(/<(\w+)[^>]*$/);
            if (tagMatch) {
              const tagName = tagMatch[1];
              // Skip self-closing tags and closing tags
              if (!beforeCursor.endsWith('/') && !beforeCursor.includes('</')) {
                // Check if closing tag doesn't already exist right after
                const afterCursor = line.substring(position.column);
                if (!afterCursor.trim().startsWith(`</${tagName}>`)) {
                  // Insert closing tag
                  setTimeout(() => {
                    const currentPos = editor.getPosition();
                    if (currentPos) {
                      editor.executeEdits('auto-close-tag', [
                        {
                          range: new monaco.Range(
                            currentPos.lineNumber,
                            currentPos.column,
                            currentPos.lineNumber,
                            currentPos.column
                          ),
                          text: `</${tagName}>`,
                        },
                      ]);
                      // Move cursor back before the closing tag
                      editor.setPosition({
                        lineNumber: currentPos.lineNumber,
                        column: currentPos.column,
                      });
                    }
                  }, 0);
                }
              }
            }
          }
        }
      });
    }

    // Add save shortcut (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const content = editor.getValue();
      onSave(content);
    });

    // Listen for cursor changes
    editor.onDidChangeCursorPosition((e: any) => {
      if (socket && user) {
        socket.emit('cursor:update', {
          roomId,
          projectId,
          filePath: file.path,
          position: {
            line: e.position.lineNumber,
            column: e.position.column,
          },
        });
      }
    });

    // Listen for content changes
    let changeTimeout: NodeJS.Timeout;
    editor.onDidChangeModelContent(() => {
      const content = editor.getValue();
      // Call onChange immediately for real-time updates
      if (onChange) {
        onChange(content);
      }
      
      clearTimeout(changeTimeout);
      changeTimeout = setTimeout(() => {
        // Auto-save after 2 seconds of inactivity
        onSave(content);
      }, 2000);
    });
  };

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      hpp: 'cpp',
      json: 'json',
      html: 'html',
      css: 'css',
      md: 'markdown',
      yml: 'yaml',
      yaml: 'yaml',
    };
    return langMap[ext || ''] || 'plaintext';
  };

  return (
    <div className="relative h-full">
      <Editor
        height="100%"
        language={getLanguage(file.path)}
        value={file.content}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
          formatOnPaste: true,
          formatOnType: true,
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoIndent: 'full',
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          wordBasedSuggestions: 'allDocuments',
        }}
      />
      <LiveCursors editorRef={editorRef} />
    </div>
  );
}

