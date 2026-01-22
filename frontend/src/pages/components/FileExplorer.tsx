import { useState, useRef, useEffect } from 'react';
import { Folder, File, Plus, Copy, Clipboard, GripVertical } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface File {
  id: string;
  path: string;
  content: string;
  isDirectory: boolean;
}

interface FileExplorerProps {
  files: File[];
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  projectId: string;
  onFilesChange?: () => void;
}

interface ContextMenu {
  x: number;
  y: number;
  targetPath: string;
  targetIsDir: boolean;
  targetId?: string;
}

export default function FileExplorer({
  files,
  selectedFile,
  onFileSelect,
  projectId,
  onFilesChange,
}: FileExplorerProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [copiedFile, setCopiedFile] = useState<File | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ file: File; path: string } | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  const toggleDir = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const buildTree = () => {
    const tree: any = {};
    
    files.forEach((file) => {
      const parts = file.path.split('/').filter(p => p);
      let current = tree;
      
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          current[part] = file;
        } else {
          if (!current[part]) {
            current[part] = { _isDir: true, _files: {} };
          } else if (!current[part]._isDir && current[part].id) {
            current[part] = { _isDir: true, _files: {} };
          }
          if (current[part]._isDir) {
            current = current[part]._files;
          }
        }
      });
    });
    
    return tree;
  };

  const handleContextMenu = (e: React.MouseEvent, path: string, isDir: boolean, fileId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetPath: path,
      targetIsDir: isDir,
      targetId: fileId,
    });
  };

  const handleCreateFileInPath = (targetPath: string) => {
    setCurrentPath(targetPath);
    setShowNewFile(true);
    setContextMenu(null);
  };

  const handleCreateFolderInPath = (targetPath: string) => {
    setCurrentPath(targetPath);
    setShowNewFolder(true);
    setContextMenu(null);
  };

  const handleCopy = (file: File) => {
    setCopiedFile(file);
    setContextMenu(null);
    toast.success('Copied to clipboard');
  };

  const handlePaste = async (targetPath: string) => {
    if (!copiedFile) {
      toast.error('Nothing to paste');
      setContextMenu(null);
      return;
    }

    try {
      const fileName = copiedFile.path.split('/').pop() || 'file';
      const newPath = targetPath ? `${targetPath}/${fileName}` : fileName;
      
      // Check if file already exists
      const existing = files.find(f => f.path === newPath);
      if (existing) {
        toast.error('File already exists at this location');
        setContextMenu(null);
        return;
      }

      await api.post(`/files/${projectId}`, {
        path: newPath,
        content: copiedFile.content,
        isDirectory: copiedFile.isDirectory,
      });

      toast.success('Pasted successfully');
      setContextMenu(null);
      if (onFilesChange) {
        onFilesChange();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to paste');
      setContextMenu(null);
    }
  };

  const handleMove = async (file: File, newPath: string) => {
    try {
      await api.put(`/files/${projectId}/${file.id}`, {
        path: newPath,
      });

      toast.success('Moved successfully');
      if (onFilesChange) {
        onFilesChange();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to move');
    }
  };

  const handleDragStart = (e: React.DragEvent, file: File, path: string) => {
    setDraggedItem({ file, path });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', file.id);
  };

  const handleDragOver = (e: React.DragEvent, path: string, isDir: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDir && draggedItem) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverPath(path);
    }
  };

  const handleDragLeave = () => {
    setDragOverPath(null);
  };

  const handleDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPath(null);

    if (!draggedItem) return;

    const fileName = draggedItem.file.path.split('/').pop() || 'file';
    const newPath = targetPath ? `${targetPath}/${fileName}` : fileName;

    if (newPath === draggedItem.file.path) {
      return; // Same location
    }

    handleMove(draggedItem.file, newPath);
    setDraggedItem(null);
  };

  const renderTree = (node: any, path: string = '', level: number = 0) => {
    const items: JSX.Element[] = [];
    const keys = Object.keys(node).filter((k) => !k.startsWith('_'));

    keys.forEach((key) => {
      const item = node[key];
      const fullPath = path ? `${path}/${key}` : key;
      const isExpanded = expandedDirs.has(fullPath);

      if (item._isDir || (item.isDirectory && item.id)) {
        const children = item._files || {};
        const childKeys = Object.keys(children).filter(k => !k.startsWith('_'));
        const hasChildren = childKeys.length > 0;
        const isDragOver = dragOverPath === fullPath;
        
        items.push(
          <div key={fullPath}>
            <div
              className={`flex items-center space-x-1 px-2 py-1 hover:bg-gray-700/50 cursor-pointer group rounded transition-colors ${
                level > 0 ? 'ml-4' : ''
              } ${isDragOver ? 'bg-collab-500/20 border border-collab-500/50' : ''}`}
              onClick={() => {
                toggleDir(fullPath);
                setCurrentPath(fullPath);
              }}
              onContextMenu={(e) => handleContextMenu(e, fullPath, true, item.id)}
              onDragOver={(e) => handleDragOver(e, fullPath, true)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, fullPath)}
              draggable
              onDragStart={(e) => {
                const fileObj = item.id ? item : files.find(f => f.path === fullPath) || { id: fullPath, path: fullPath, content: '', isDirectory: true };
                handleDragStart(e, fileObj, fullPath);
              }}
            >
              <GripVertical className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Folder className={`w-4 h-4 text-yellow-500 ${isExpanded ? 'fill-current' : ''}`} />
              <span className="text-sm text-gray-300 flex-1">{key}</span>
              {hasChildren && (
                <span className="text-xs text-gray-500 ml-1">
                  {isExpanded ? '▼' : '▶'}
                </span>
              )}
            </div>
            {isExpanded && hasChildren && (
              <div className="ml-2">
                {renderTree(children, fullPath, level + 1)}
              </div>
            )}
          </div>
        );
      } else if (item.id && !item.isDirectory) {
        items.push(
          <div
            key={item.id}
            className={`flex items-center space-x-1 px-2 py-1 hover:bg-gray-700/50 cursor-pointer group rounded transition-colors ${
              selectedFile?.id === item.id ? 'bg-collab-500/20 border border-collab-500/50' : ''
            } ${level > 0 ? 'ml-4' : ''}`}
            onClick={() => onFileSelect(item)}
            onContextMenu={(e) => handleContextMenu(e, fullPath, false, item.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, item, fullPath)}
          >
            <GripVertical className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <File className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-300 flex-1">{key}</span>
          </div>
        );
      }
    });

    return items;
  };

  const handleCreateFile = async () => {
    if (!newFileName) return;
    try {
      const fullPath = currentPath ? `${currentPath}/${newFileName}` : newFileName;
      await api.post(`/files/${projectId}`, {
        path: fullPath,
        content: '',
        isDirectory: false,
      });
      toast.success('File created');
      setShowNewFile(false);
      setNewFileName('');
      setCurrentPath('');
      if (onFilesChange) {
        onFilesChange();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create file');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    try {
      const fullPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
      await api.post(`/files/${projectId}`, {
        path: fullPath,
        content: '',
        isDirectory: true,
      });
      toast.success('Folder created');
      setShowNewFolder(false);
      setNewFolderName('');
      setCurrentPath('');
      if (currentPath) {
        setExpandedDirs(new Set([...expandedDirs, currentPath]));
      }
      if (onFilesChange) {
        onFilesChange();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create folder');
    }
  };

  const tree = buildTree();

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-2 relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-white">Files</h3>
        <div className="flex gap-1">
          <button
            onClick={() => {
              setShowNewFolder(true);
              setCurrentPath('');
            }}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Create Folder"
          >
            <Folder className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setShowNewFile(true);
              setCurrentPath('');
            }}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Create File"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {renderTree(tree)}

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-dark-surface/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-lg shadow-2xl z-50 py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.targetIsDir ? (
            <>
              <button
                onClick={() => handleCreateFileInPath(contextMenu.targetPath)}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center gap-2 rounded transition-colors"
              >
                <File className="w-4 h-4" />
                New File
              </button>
              <button
                onClick={() => handleCreateFolderInPath(contextMenu.targetPath)}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center gap-2 rounded transition-colors"
              >
                <Folder className="w-4 h-4" />
                New Folder
              </button>
              {copiedFile && (
                <button
                  onClick={() => handlePaste(contextMenu.targetPath)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center gap-2 rounded transition-colors"
                >
                  <Clipboard className="w-4 h-4" />
                  Paste
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  const file = files.find(f => f.id === contextMenu.targetId);
                  if (file) handleCopy(file);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center gap-2 rounded transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </>
          )}
        </div>
      )}

      {showNewFile && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder={currentPath ? `${currentPath}/filename.ext` : 'filename.ext'}
            className="w-full px-2 py-1 text-sm border border-gray-700/50 rounded bg-gray-800/50 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-collab-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateFile();
              } else if (e.key === 'Escape') {
                setShowNewFile(false);
                setNewFileName('');
              }
            }}
            autoFocus
          />
          <div className="mt-1 flex space-x-1">
            <button
              onClick={handleCreateFile}
              className="px-2 py-1 text-xs bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-collab-500/50 transition-all"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewFile(false);
                setNewFileName('');
              }}
              className="px-2 py-1 text-xs bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showNewFolder && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={currentPath ? `${currentPath}/foldername` : 'foldername'}
            className="w-full px-2 py-1 text-sm border border-gray-700/50 rounded bg-gray-800/50 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-collab-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateFolder();
              } else if (e.key === 'Escape') {
                setShowNewFolder(false);
                setNewFolderName('');
              }
            }}
            autoFocus
          />
          <div className="mt-1 flex space-x-1">
            <button
              onClick={handleCreateFolder}
              className="px-2 py-1 text-xs bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-collab-500/50 transition-all"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName('');
              }}
              className="px-2 py-1 text-xs bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
