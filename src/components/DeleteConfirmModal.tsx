import { AlertCircle, X, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  title: string;
  message: string;
  itemCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export default function DeleteConfirmModal({
  title,
  message,
  itemCount,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="text-red-600" size={24} />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600">
                {message}
              </p>
              {itemCount && itemCount > 1 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 font-medium">
                    You are about to delete {itemCount} photo{itemCount > 1 ? 's' : ''}
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-3 font-medium">
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={18} className="mr-2" />
                Delete {itemCount && itemCount > 1 ? `(${itemCount})` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
