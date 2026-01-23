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
  editorRef?: React.MutableRefObject<any>;
}

export default function MonacoEditor({ file, onSave, onChange, projectId, roomId, editorRef: externalEditorRef }: MonacoEditorProps) {
  const internalEditorRef = useRef<any>(null);
  const editorRef = externalEditorRef || internalEditorRef;
  const { user } = useAuthStore();
  const socket = getSocket();
  const { addCursor, updateCursor, removeCursor } = useSessionStore();

  useEffect(() => {
    if (!socket || !editorRef.current) return;

    const handleCursorUpdate = (data: any) => {
      // Skip own cursor updates
      if (data.userId === user?.id) return;
      
      // Remove cursor if user switched to a different file
      if (data.filePath && data.filePath !== file.path) {
        removeCursor(data.userId);
        return;
      }
      
      // Only show cursors for users on the same file
      if (data.filePath !== file.path) {
        return;
      }
      
      // Update cursor in session store
      const cursor = {
        userId: data.userId,
        userName: data.userName || 'Unknown',
        color: '',
        position: data.position || { line: 1, column: 1 },
        fileId: file.id,
        filePath: data.filePath || file.path,
      };
      
      // Check if cursor already exists for this file
      const existingCursor = useSessionStore.getState().cursors.find(c => c.userId === data.userId && c.fileId === file.id);
      if (existingCursor) {
        updateCursor(data.userId, cursor.position);
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

  // Clean up cursors when file changes - remove cursors from other files
  useEffect(() => {
    const currentCursors = useSessionStore.getState().cursors;
    currentCursors.forEach(cursor => {
      if (cursor.fileId !== file.id) {
        removeCursor(cursor.userId);
      }
    });
    
    // Also emit file:open when file changes to notify others
    if (socket && user) {
      socket.emit('file:open', {
        roomId,
        projectId,
        filePath: file.path,
      });
    }
  }, [file.id, file.path, socket, roomId, projectId, user, removeCursor]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    // Also update external ref if provided
    if (externalEditorRef) {
      externalEditorRef.current = editor;
    }

    // Configure editor
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      wordWrap: 'on',
      automaticLayout: true,
      // Enable Emmet
      emmet: {
        enabled: true,
      },
      // Auto-close suggestions on Enter
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
    });

    // Enable Emmet - Monaco has built-in Emmet support
    // Just need to configure it properly
    monaco.languages.setLanguageConfiguration('html', {
      wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
      comments: {
        blockComment: ['<!--', '-->']
      },
      brackets: [
        ['<', '>'],
        ['{', '}'],
        ['[', ']']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"', notIn: ['string'] },
        { open: "'", close: "'", notIn: ['string', 'comment'] },
        { open: '`', close: '`', notIn: ['string', 'comment'] },
        { open: '/**', close: ' */', notIn: ['string'] }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '<', close: '>' }
      ]
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

    // Track last emitted position to avoid spam
    let lastEmittedPosition = { line: 0, column: 0 };
    let cursorUpdateTimeout: NodeJS.Timeout;

    // Listen for cursor changes
    editor.onDidChangeCursorPosition((e: any) => {
      if (socket && user) {
        const newPosition = {
          line: e.position.lineNumber,
          column: e.position.column,
        };

        // Throttle cursor updates (only emit if position changed significantly or after delay)
        clearTimeout(cursorUpdateTimeout);
        cursorUpdateTimeout = setTimeout(() => {
          // Only emit if position changed
          if (lastEmittedPosition.line !== newPosition.line || lastEmittedPosition.column !== newPosition.column) {
            socket.emit('cursor:update', {
              roomId,
              projectId,
              filePath: file.path,
              position: newPosition,
            });
            lastEmittedPosition = newPosition;
          }
        }, 50); // Throttle to max 20 updates per second
        
        // Always emit file:open when cursor moves (to update active file)
        socket.emit('file:open', {
          roomId,
          projectId,
          filePath: file.path,
        });
      }
    });

    // Listen for content changes
    let changeTimeout: NodeJS.Timeout;
    editor.onDidChangeModelContent((e: monaco.editor.IModelContentChangedEvent) => {
      const content = editor.getValue();
      // Call onChange immediately for real-time updates
      if (onChange) {
        onChange(content);
      }
      
      // Handle Emmet expansion for "!" (HTML5 structure)
      const model = editor.getModel();
      if (model) {
        const changes = e.changes;
        for (const change of changes) {
          if (change.text === '!') {
            const position = new monaco.Position(change.range.startLineNumber, change.range.startColumn);
            const line = model.getLineContent(position.lineNumber);
            const beforeCursor = line.substring(0, position.column - 1);
            
            // Check if "!" is at the start of line (Emmet pattern)
            if (beforeCursor.trim() === '' && position.column === 1) {
              // Add Tab command to expand
              editor.addCommand(monaco.KeyCode.Tab, () => {
                const currentPos = editor.getPosition();
                if (currentPos && currentPos.lineNumber === position.lineNumber) {
                  const currentLine = model.getLineContent(currentPos.lineNumber);
                  if (currentLine.trim() === '!') {
                    const htmlStructure = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
</html>`;
                    
                    editor.executeEdits('emmet-expand', [
                      {
                        range: new monaco.Range(
                          currentPos.lineNumber,
                          1,
                          currentPos.lineNumber,
                          currentPos.column
                        ),
                        text: htmlStructure,
                      },
                    ]);
                    
                    // Move cursor to title
                    const titleLine = htmlStructure.split('\n').findIndex(line => line.includes('<title>')) + currentPos.lineNumber;
                    editor.setPosition({ lineNumber: titleLine, column: 12 });
                  }
                }
              });
            }
          }
        }
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
      // JavaScript/TypeScript
      js: 'javascript',
      jsx: 'javascript',
      mjs: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      // Python
      py: 'python',
      pyw: 'python',
      pyi: 'python',
      // Java
      java: 'java',
      // C/C++
      c: 'c',
      h: 'c',
      cpp: 'cpp',
      cxx: 'cpp',
      cc: 'cpp',
      hpp: 'cpp',
      hxx: 'cpp',
      // Web
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      // Data
      json: 'json',
      xml: 'xml',
      yml: 'yaml',
      yaml: 'yaml',
      // Markup
      md: 'markdown',
      markdown: 'markdown',
      // Shell
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
      // SQL
      sql: 'sql',
      // Go
      go: 'go',
      // Rust
      rs: 'rust',
      // PHP
      php: 'php',
      // Ruby
      rb: 'ruby',
      // Swift
      swift: 'swift',
      // Kotlin
      kt: 'kotlin',
      kts: 'kotlin',
      // Dart
      dart: 'dart',
      // R
      r: 'r',
      // Scala
      scala: 'scala',
      // Perl
      pl: 'perl',
      pm: 'perl',
      // Lua
      lua: 'lua',
      // Docker
      dockerfile: 'dockerfile',
      // Config
      ini: 'ini',
      toml: 'toml',
      conf: 'ini',
      // Other
      txt: 'plaintext',
      log: 'plaintext',
    };
    return langMap[ext || ''] || 'plaintext';
  };

  // Expose editor to window for WhatsApp sharing
  useEffect(() => {
    if (editorRef.current) {
      (window as any).monacoEditor = editorRef.current;
    }
    return () => {
      if ((window as any).monacoEditor === editorRef.current) {
        delete (window as any).monacoEditor;
      }
    };
  }, [editorRef.current]);

  return (
    <div className="relative w-full h-full">
      <Editor
        height="100%"
        width="100%"
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
      <LiveCursors editorRef={editorRef} currentFileId={file.id} currentFilePath={file.path} />
    </div>
  );
}

