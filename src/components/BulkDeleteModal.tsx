import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';

interface BulkDeleteModalProps {
  itemCount: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({ itemCount, onConfirm, onClose }) => {
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting items:', error);
    } finally {
      setDeleting(false);
    }
  };

  const isConfirmValid = confirmText.toLowerCase() === 'delete';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Confirm Bulk Delete</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={deleting}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">
              <span className="font-semibold">Warning:</span> This action cannot be undone!
            </p>
          </div>

          <p className="text-gray-700 mb-4">
            You are about to permanently delete <span className="font-bold text-red-600">{itemCount}</span> item{itemCount !== 1 ? 's' : ''} from your inventory.
          </p>

          <p className="text-gray-700 mb-4">
            This will also delete:
          </p>
          <ul className="list-disc list-inside text-gray-600 text-sm mb-4 space-y-1">
            <li>All serialized items associated with these items</li>
            <li>All transaction history</li>
            <li>All images and attachments</li>
            <li>All related records</li>
          </ul>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-mono bg-gray-100 px-2 py-1 rounded">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Type DELETE"
              disabled={deleting}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isConfirmValid || deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={20} />
              {deleting ? 'Deleting...' : `Delete ${itemCount} Item${itemCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkDeleteModal;
