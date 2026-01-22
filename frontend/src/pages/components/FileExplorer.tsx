import { useState } from 'react';
import { Folder, File, Plus, Trash2 } from 'lucide-react';
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
}

export default function FileExplorer({
  files,
  selectedFile,
  onFileSelect,
  projectId,
}: FileExplorerProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

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
      const parts = file.path.split('/');
      let current = tree;
      parts.forEach((part, index) => {
        if (index === parts.length - 1 && !file.isDirectory) {
          current[part] = file;
        } else {
          if (!current[part]) {
            current[part] = { _files: [], _isDir: true };
          }
          current = current[part];
        }
      });
    });
    return tree;
  };

  const renderTree = (node: any, path: string = '', level: number = 0) => {
    const items: JSX.Element[] = [];
    const keys = Object.keys(node).filter((k) => !k.startsWith('_'));

    keys.forEach((key) => {
      const item = node[key];
      const fullPath = path ? `${path}/${key}` : key;
      const isExpanded = expandedDirs.has(fullPath);

      if (item._isDir || (item.isDirectory && item.id)) {
        items.push(
          <div key={fullPath}>
            <div
              className={`flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                level > 0 ? 'ml-4' : ''
              }`}
              onClick={() => toggleDir(fullPath)}
            >
              <Folder className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{key}</span>
            </div>
            {isExpanded && item._files && renderTree(item._files, fullPath, level + 1)}
          </div>
        );
      } else if (item.id) {
        items.push(
          <div
            key={item.id}
            className={`flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
              selectedFile?.id === item.id ? 'bg-primary-100 dark:bg-primary-900' : ''
            } ${level > 0 ? 'ml-4' : ''}`}
            onClick={() => onFileSelect(item)}
          >
            <File className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{key}</span>
          </div>
        );
      }
    });

    return items;
  };

  const handleCreateFile = async () => {
    if (!newFileName) return;
    try {
      const response = await api.post(`/files/${projectId}`, {
        path: newFileName,
        content: '',
        isDirectory: false,
      });
      toast.success('File created');
      setShowNewFile(false);
      setNewFileName('');
      // Reload files
      window.location.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create file');
    }
  };

  const handleDeleteFile = async (file: File) => {
    if (!confirm(`Delete ${file.path}?`)) return;
    try {
      await api.delete(`/files/${projectId}/${file.id}`);
      toast.success('File deleted');
      if (selectedFile?.id === file.id) {
        onFileSelect(files.find((f) => f.id !== file.id) || files[0]);
      }
      // Reload files
      window.location.reload();
    } catch (error: any) {
      toast.error('Failed to delete file');
    }
  };

  const tree = buildTree();

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Files</h3>
        <button
          onClick={() => setShowNewFile(true)}
          className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {renderTree(tree)}

      {showNewFile && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="filename.ext"
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateFile();
              } else if (e.key === 'Escape') {
                setShowNewFile(false);
              }
            }}
            autoFocus
          />
          <div className="mt-1 flex space-x-1">
            <button
              onClick={handleCreateFile}
              className="px-2 py-1 text-xs bg-primary-600 text-white rounded"
            >
              Create
            </button>
            <button
              onClick={() => setShowNewFile(false)}
              className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

