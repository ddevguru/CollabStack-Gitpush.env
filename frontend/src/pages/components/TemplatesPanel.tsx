import { useEffect, useState } from 'react';
import api from '@/services/api';
import { Star, Copy, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  name: string;
  description?: string;
  language: string;
  code: string;
  category: string;
  usageCount: number;
  rating: number;
  tags: string[];
}

interface Snippet {
  id: string;
  name: string;
  code: string;
  language: string;
  tags: string[];
  isFavorite: boolean;
}

interface TemplatesPanelProps {
  language?: string;
  onSelectTemplate?: (code: string) => void;
}

export default function TemplatesPanel({ language, onSelectTemplate }: TemplatesPanelProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'snippets'>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateSnippet, setShowCreateSnippet] = useState(false);
  const [newSnippet, setNewSnippet] = useState({
    name: '',
    code: '',
    language: language || 'javascript',
    tags: '',
  });

  useEffect(() => {
    loadTemplates();
    loadSnippets();
  }, [language]);

  const loadTemplates = async () => {
    try {
      const response = await api.get(`/templates?language=${language || ''}`);
      setTemplates(response.data.data.templates);
    } catch (error) {
      console.error('Failed to load templates');
    }
  };

  const loadSnippets = async () => {
    try {
      const response = await api.get('/templates/snippets');
      setSnippets(response.data.data.snippets);
    } catch (error) {
      console.error('Failed to load snippets');
    }
  };

  const handleUseTemplate = async (templateId: string, code: string) => {
    try {
      await api.post(`/templates/${templateId}/use`);
      if (onSelectTemplate) {
        onSelectTemplate(code);
      }
      toast.success('Template applied');
    } catch (error) {
      toast.error('Failed to use template');
    }
  };

  const handleCreateSnippet = async () => {
    try {
      await api.post('/templates/snippets', {
        ...newSnippet,
        tags: newSnippet.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      toast.success('Snippet created');
      setShowCreateSnippet(false);
      setNewSnippet({ name: '', code: '', language: language || 'javascript', tags: '' });
      loadSnippets();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create snippet');
    }
  };

  const handleToggleFavorite = async (snippetId: string) => {
    try {
      await api.post(`/templates/snippets/${snippetId}/favorite`);
      loadSnippets();
    } catch (error) {
      toast.error('Failed to update favorite');
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSnippets = snippets.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Templates & Snippets</h3>
          {activeTab === 'snippets' && (
            <button
              onClick={() => setShowCreateSnippet(true)}
              className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
              title="Create Snippet"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-3">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'templates'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('snippets')}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'snippets'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            My Snippets
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'templates' ? (
          <div className="space-y-3">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No templates found
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        {template.name}
                      </h4>
                      {template.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                          {template.language}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">
                          {template.category}
                        </span>
                        <span>⭐ {template.rating.toFixed(1)}</span>
                        <span>👁 {template.usageCount}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUseTemplate(template.id, template.code)}
                      className="ml-2 p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                      title="Use Template"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSnippets.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No snippets yet. Create one to get started!
              </div>
            ) : (
              filteredSnippets.map((snippet) => (
                <div
                  key={snippet.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {snippet.name}
                        </h4>
                        <button
                          onClick={() => handleToggleFavorite(snippet.id)}
                          className={`p-0.5 ${
                            snippet.isFavorite
                              ? 'text-yellow-500'
                              : 'text-gray-400 hover:text-yellow-500'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${snippet.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                          {snippet.language}
                        </span>
                        {snippet.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                        <code className="text-gray-800 dark:text-gray-200">
                          {snippet.code.substring(0, 100)}
                          {snippet.code.length > 100 ? '...' : ''}
                        </code>
                      </pre>
                    </div>
                    <button
                      onClick={() => onSelectTemplate?.(snippet.code)}
                      className="ml-2 p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                      title="Use Snippet"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Snippet Modal */}
      {showCreateSnippet && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Create Snippet
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newSnippet.name}
                  onChange={(e) => setNewSnippet({ ...newSnippet, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Language
                </label>
                <select
                  value={newSnippet.language}
                  onChange={(e) => setNewSnippet({ ...newSnippet, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Code
                </label>
                <textarea
                  value={newSnippet.code}
                  onChange={(e) => setNewSnippet({ ...newSnippet, code: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newSnippet.tags}
                  onChange={(e) => setNewSnippet({ ...newSnippet, tags: e.target.value })}
                  placeholder="react, hooks, state"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowCreateSnippet(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSnippet}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

