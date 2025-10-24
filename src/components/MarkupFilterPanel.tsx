import { X, Filter } from 'lucide-react';

interface MarkupFilterPanelProps {
  availableTypes: string[];
  visibleTypes: Set<string>;
  onToggleType: (type: string) => void;
  onToggleAll: (visible: boolean) => void;
  onClose: () => void;
}

export default function MarkupFilterPanel({
  availableTypes,
  visibleTypes,
  onToggleType,
  onToggleAll,
  onClose
}: MarkupFilterPanelProps) {
  const allVisible = availableTypes.every(type => visibleTypes.has(type));
  const someVisible = availableTypes.some(type => visibleTypes.has(type));

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'pen': 'Freehand Lines',
      'line': 'Lines',
      'multiline': 'Multi-Lines',
      'arrow': 'Arrows',
      'rectangle': 'Rectangles',
      'circle': 'Circles',
      'ellipse': 'Ellipses',
      'triangle': 'Triangles',
      'polygon': 'Polygons',
      'cloud': 'Clouds',
      'text': 'Text',
      'dimension': 'Dimensions',
      'issue': 'Issues',
      'highlighter': 'Highlights',
      'photo': 'Photo Pins',
      'symbol': 'Symbols',
      'measure-line': 'Measurements (Line)',
      'measure-multiline': 'Measurements (Multi)',
      'measure-area': 'Measurements (Area)',
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-gray-900 rounded-lg shadow-2xl border-2 border-gray-700 w-96 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Filter size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Filter Markup</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            {visibleTypes.size} of {availableTypes.length} visible
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => onToggleAll(true)}
              disabled={allVisible}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Show All
            </button>
            <button
              onClick={() => onToggleAll(false)}
              disabled={!someVisible}
              className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Hide All
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {availableTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No markup items on this drawing
            </div>
          ) : (
            <div className="space-y-1">
              {availableTypes.map(type => {
                const isVisible = visibleTypes.has(type);
                return (
                  <label
                    key={type}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => onToggleType(type)}
                      className="w-5 h-5 rounded border-2 border-gray-600 bg-gray-800 checked:bg-blue-600 checked:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer transition-colors"
                    />
                    <span className={`flex-1 text-sm font-medium transition-colors ${
                      isVisible ? 'text-white' : 'text-gray-500'
                    }`}>
                      {getTypeLabel(type)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded transition-colors ${
                      isVisible ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-500'
                    }`}>
                      {isVisible ? 'Visible' : 'Hidden'}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
