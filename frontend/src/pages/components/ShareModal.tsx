import { useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Copy, QrCode, Link as LinkIcon, Lock, Calendar, Eye } from 'lucide-react';

interface ShareModalProps {
  projectId?: string;
  fileId?: string;
  code?: string;
  onClose: () => void;
}

export default function ShareModal({ projectId, fileId, code, onClose }: ShareModalProps) {
  const [shareLink, setShareLink] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    accessType: 'READ_ONLY',
    expiresAt: '',
    maxViews: '',
    password: '',
  });

  const handleCreateLink = async () => {
    setLoading(true);
    try {
      const response = await api.post('/share/create', {
        projectId,
        fileId,
        code,
        ...form,
        expiresAt: form.expiresAt || undefined,
        maxViews: form.maxViews ? parseInt(form.maxViews) : undefined,
        password: form.password || undefined,
      });

      setShareLink(response.data.data.shareLink);
      toast.success('Share link created!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/share/${shareLink.shortCode}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const handleGetQR = async () => {
    try {
      const response = await api.get(`/share/${shareLink.shortCode}/qr`);
      // In production, show QR code modal
      window.open(response.data.data.qrCodeUrl, '_blank');
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Create Share Link
        </h3>

        {!shareLink ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Access Type
              </label>
              <select
                value={form.accessType}
                onChange={(e) => setForm({ ...form, accessType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="READ_ONLY">Read Only</option>
                <option value="EDIT">Can Edit</option>
                <option value="FULL_ACCESS">Full Access</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expires At (Optional)
              </label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Views (Optional)
              </label>
              <input
                type="number"
                value={form.maxViews}
                onChange={(e) => setForm({ ...form, maxViews: e.target.value })}
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password (Optional)
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Leave empty for no password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLink}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <LinkIcon className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-gray-900 dark:text-white">Share Link</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/share/${shareLink.shortCode}`}
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  title="Copy Link"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleGetQR}
                  className="p-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  title="Get QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <Eye className="w-4 h-4" />
                <span>{shareLink.viewCount} views</span>
              </div>
              {shareLink.expiresAt && (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Expires: {new Date(shareLink.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
              {shareLink.password && (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <Lock className="w-4 h-4" />
                  <span>Password protected</span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

