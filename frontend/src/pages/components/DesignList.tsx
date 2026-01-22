import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, Plus, Trash2, Edit, Eye } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface DesignListProps {
  projectId: string;
  onSelectDesign: (designId: string) => void;
  onNewDesign: () => void;
  onCreateNew?: () => void;
}

interface Design {
  id: string;
  name: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function DesignList({ projectId, onSelectDesign, onNewDesign, onCreateNew }: DesignListProps) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDesigns();
  }, [projectId]);

  const loadDesigns = async () => {
    try {
      const response = await api.get(`/designs/projects/${projectId}`);
      if (response.data.success) {
        setDesigns(response.data.data.designs);
      }
    } catch (error) {
      console.error('Failed to load designs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (designId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      await api.delete(`/designs/${designId}`);
      toast.success('Design deleted');
      loadDesigns();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete design');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-collab-400"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Palette className="w-5 h-5 text-collab-400" />
          Designs
        </h3>
        <button
          onClick={() => {
            if (onCreateNew) {
              onCreateNew();
            } else {
              onNewDesign();
            }
          }}
          className="px-4 py-2 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Design
        </button>
      </div>

      {designs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Palette className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No designs yet</p>
          <p className="text-sm mt-2">Create your first design to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map((design) => (
            <motion.div
              key={design.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => onSelectDesign(design.id)}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 cursor-pointer hover:border-collab-500/50 transition-all"
            >
              <div className="aspect-video bg-gray-700/50 rounded mb-3 flex items-center justify-center">
                {design.thumbnail ? (
                  <img src={design.thumbnail} alt={design.name} className="w-full h-full object-cover rounded" />
                ) : (
                  <Palette className="w-12 h-12 text-gray-500" />
                )}
              </div>
              <h4 className="text-white font-semibold mb-1 truncate">{design.name}</h4>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{design.user.name}</span>
                <span>{new Date(design.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDesign(design.id);
                  }}
                  className="flex-1 px-2 py-1 bg-collab-500 text-white rounded text-sm hover:bg-collab-600 transition-colors flex items-center justify-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  Open
                </button>
                <button
                  onClick={(e) => handleDelete(design.id, e)}
                  className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

