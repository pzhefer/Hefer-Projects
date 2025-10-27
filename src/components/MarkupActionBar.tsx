import { useState } from 'react';
import { Copy, Trash2, Lock, Unlock, ArrowUp, ArrowDown, Droplet, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, AlignLeft, AlignCenter, AlignRight, Edit2, Edit3 } from 'lucide-react';

interface MarkupActionBarProps {
  position: { x: number; y: number };
  isLocked: boolean;
  color: string;
  strokeWidth: number;
  fillColor?: string;
  fillOpacity?: number;
  showFillControls?: boolean;
  multipleSelected?: boolean;
  isTextMarkup?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: number;
  canEditVertices?: boolean;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onFillColorChange?: (color: string) => void;
  onFillOpacityChange?: (opacity: number) => void;
  onTextAlignChange?: (align: 'left' | 'center' | 'right') => void;
  onFontSizeChange?: (size: number) => void;
  onEditText?: () => void;
  onEditVertices?: () => void;
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onAlignTop?: () => void;
  onAlignMiddle?: () => void;
  onAlignBottom?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLock: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export function MarkupActionBar({
  position,
  isLocked,
  color,
  strokeWidth,
  fillColor,
  fillOpacity = 1,
  showFillControls = false,
  multipleSelected = false,
  isTextMarkup = false,
  textAlign = 'left',
  fontSize = 16,
  canEditVertices = false,
  onColorChange,
  onStrokeWidthChange,
  onFillColorChange,
  onFillOpacityChange,
  onTextAlignChange,
  onFontSizeChange,
  onEditText,
  onEditVertices,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onDuplicate,
  onDelete,
  onLock,
  onBringToFront,
  onSendToBack
}: MarkupActionBarProps) {
  const [showCustomFontSize, setShowCustomFontSize] = useState(false);
  const [customFontSizeInput, setCustomFontSizeInput] = useState(String(fontSize));

  const colors = [
    '#FF0000',
    '#FF6600',
    '#FFFF00',
    '#00FF00',
    '#0099FF',
    '#9933FF',
    '#FF00FF',
    '#00FFFF',
    '#CCFF00',
    '#FF9900',
    '#00FF99',
    '#6666FF',
    '#000000',
    '#FFFFFF',
    '#999999',
  ];
  const widths = [1, 2, 3, 4, 6, 8, 10, 12];
  const fontSizes = [8, 12, 16, 22, 30];
  const opacities = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

  // Calculate clamped position to avoid toolbar overlap
  // Top toolbar height: ~48px, Bottom toolbar: ~60px, Side toolbar: 56px (w-14)
  const barHeight = showFillControls ? 110 : 60;
  const minTop = 60; // Clear of top toolbar
  const minLeft = 70; // Clear of side toolbar (56px + margin)
  const maxRight = window.innerWidth - 20; // Margin from right
  const maxBottom = window.innerHeight - 80; // Clear of bottom toolbar

  // Clamp left position
  const clampedLeft = Math.max(minLeft, Math.min(position.x, maxRight));

  // Clamp top position
  let clampedTop = position.y - barHeight;
  if (clampedTop < minTop) {
    // If it would go above top toolbar, position below the markup instead
    clampedTop = position.y + 20;
  }
  if (clampedTop + barHeight > maxBottom) {
    // If it would go below bottom toolbar, reposition above
    clampedTop = maxBottom - barHeight;
  }

  return (
    <div
      className="absolute bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50"
      style={{
        left: clampedLeft,
        top: clampedTop,
        transform: 'translateX(-50%)',
      }}
    >
      {isLocked ? (
        <div className="flex items-center gap-1 p-1">
          <button
            onClick={onLock}
            className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
            title="Unlock"
          >
            <Unlock size={16} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1 p-1">
          <div className="flex items-center gap-1">
            <div className="relative">
              <select
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                className="bg-gray-700 text-transparent text-sm rounded px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none w-12 h-8"
                title="Stroke Color"
                style={{
                  backgroundColor: color,
                  border: color === '#FFFFFF' ? '1px solid #4B5563' : 'none'
                }}
              >
                {colors.map(c => (
                  <option key={c} value={c} style={{ backgroundColor: c }}>●</option>
                ))}
              </select>
            </div>
            {isTextMarkup && onFontSizeChange ? (
              <select
                value={fontSize}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'custom') {
                    setCustomFontSizeInput(String(fontSize));
                    setShowCustomFontSize(true);
                  } else {
                    onFontSizeChange(Number(value));
                  }
                }}
                className="bg-gray-700 text-white text-sm rounded px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Font Size"
              >
                {fontSizes.map(size => (
                  <option key={size} value={size}>{size}px</option>
                ))}
                {!fontSizes.includes(fontSize) && (
                  <option value={fontSize}>{fontSize}px</option>
                )}
                <option value="custom">Custom...</option>
              </select>
            ) : (
              <select
                value={strokeWidth}
                onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
                className="bg-gray-700 text-white text-sm rounded px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Line Thickness"
              >
                {widths.map(w => (
                  <option key={w} value={w}>{w}px</option>
                ))}
              </select>
            )}
            <div className="w-px h-6 bg-gray-700" />
            <button
              onClick={onDuplicate}
              className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
              title="Duplicate"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={onLock}
              className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
              title="Lock"
            >
              <Lock size={16} />
            </button>
            <div className="w-px h-6 bg-gray-700" />
            <button
              onClick={onBringToFront}
              className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
              title="Bring to Front"
            >
              <ArrowUp size={16} />
            </button>
            <button
              onClick={onSendToBack}
              className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
              title="Send to Back"
            >
              <ArrowDown size={16} />
            </button>
            <div className="w-px h-6 bg-gray-700" />
            <button
              onClick={onDelete}
              className="p-2 hover:bg-gray-700 rounded text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {(showFillControls || multipleSelected || isTextMarkup) && (
            <div className="flex items-center gap-1 pt-1 border-t border-gray-700">
              {showFillControls && onFillColorChange && onFillOpacityChange && (
                <>
                  <div className="relative">
                    <select
                      value={fillColor || 'none'}
                      onChange={(e) => onFillColorChange(e.target.value === 'none' ? '' : e.target.value)}
                      className="bg-gray-700 text-transparent text-sm rounded px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none w-12 h-8"
                      title="Fill Color"
                      style={{
                        backgroundColor: fillColor || '#4B5563',
                        border: (fillColor === '#FFFFFF' || !fillColor) ? '1px solid #4B5563' : 'none'
                      }}
                    >
                      <option value="none">None</option>
                      {colors.map(c => (
                        <option key={c} value={c} style={{ backgroundColor: c }}>●</option>
                      ))}
                    </select>
                    <div className="absolute top-0 right-0 pointer-events-none p-1">
                      <Droplet size={12} className="text-white" style={{ filter: 'drop-shadow(0 0 1px #000)' }} />
                    </div>
                  </div>
                  {fillColor && (
                    <select
                      value={fillOpacity}
                      onChange={(e) => onFillOpacityChange(Number(e.target.value))}
                      className="bg-gray-700 text-white text-sm rounded px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Fill Opacity"
                    >
                      {opacities.map(o => (
                        <option key={o} value={o}>{Math.round(o * 100)}%</option>
                      ))}
                    </select>
                  )}
                  {(multipleSelected || isTextMarkup) && onAlignLeft && <div className="w-px h-6 bg-gray-700" />}
                </>
              )}

              {canEditVertices && onEditVertices && (
                <>
                  <button
                    onClick={onEditVertices}
                    className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
                    title="Edit Vertices"
                  >
                    <Edit3 size={16} />
                  </button>
                  <div className="w-px h-6 bg-gray-700" />
                </>
              )}

              {isTextMarkup && (
                <>
                  {onEditText && (
                    <>
                      <button
                        onClick={onEditText}
                        className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
                        title="Edit Text"
                      >
                        <Edit2 size={16} />
                      </button>
                      <div className="w-px h-6 bg-gray-700" />
                    </>
                  )}
                  {onTextAlignChange && (
                    <>
                      <button
                        onClick={() => onTextAlignChange('left')}
                        className={`p-2 hover:bg-gray-700 rounded transition-colors ${textAlign === 'left' ? 'bg-gray-700 text-blue-400' : 'text-white'}`}
                        title="Align Text Left"
                      >
                        <AlignLeft size={16} />
                      </button>
                      <button
                        onClick={() => onTextAlignChange('center')}
                        className={`p-2 hover:bg-gray-700 rounded transition-colors ${textAlign === 'center' ? 'bg-gray-700 text-blue-400' : 'text-white'}`}
                        title="Align Text Center"
                      >
                        <AlignCenter size={16} />
                      </button>
                      <button
                        onClick={() => onTextAlignChange('right')}
                        className={`p-2 hover:bg-gray-700 rounded transition-colors ${textAlign === 'right' ? 'bg-gray-700 text-blue-400' : 'text-white'}`}
                        title="Align Text Right"
                      >
                        <AlignRight size={16} />
                      </button>
                    </>
                  )}
                  {multipleSelected && onAlignLeft && <div className="w-px h-6 bg-gray-700" />}
                </>
              )}

              {multipleSelected && onAlignLeft && onAlignCenter && onAlignRight && onAlignTop && onAlignMiddle && onAlignBottom && (
                <>
                  <button
                    onClick={onAlignLeft}
                    className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
                    title="Align Left"
                  >
                    <AlignStartVertical size={16} />
                  </button>
                  <button
                    onClick={onAlignCenter}
                    className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
                    title="Align Center"
                  >
                    <AlignCenterVertical size={16} />
                  </button>
                  <button
                    onClick={onAlignRight}
                    className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
                    title="Align Right"
                  >
                    <AlignEndVertical size={16} />
                  </button>
                  <div className="w-px h-6 bg-gray-700" />
                  <button
                    onClick={onAlignTop}
                    className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
                    title="Align Top"
                  >
                    <AlignStartHorizontal size={16} />
                  </button>
                  <button
                    onClick={onAlignMiddle}
                    className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
                    title="Align Middle"
                  >
                    <AlignCenterHorizontal size={16} />
                  </button>
                  <button
                    onClick={onAlignBottom}
                    className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
                    title="Align Bottom"
                  >
                    <AlignEndHorizontal size={16} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {showCustomFontSize && onFontSizeChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Enter custom font size (px)</h3>
            <input
              type="number"
              value={customFontSizeInput}
              onChange={(e) => setCustomFontSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const size = Number(customFontSizeInput);
                  if (!isNaN(size) && size > 0 && size <= 200) {
                    onFontSizeChange(size);
                    setShowCustomFontSize(false);
                  }
                } else if (e.key === 'Escape') {
                  setShowCustomFontSize(false);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter font size"
              autoFocus
              min="1"
              max="200"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCustomFontSize(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const size = Number(customFontSizeInput);
                  if (!isNaN(size) && size > 0 && size <= 200) {
                    onFontSizeChange(size);
                    setShowCustomFontSize(false);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
