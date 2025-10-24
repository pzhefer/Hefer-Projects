import { useRef, useEffect } from 'react';
import { Trash2, Layers } from 'lucide-react';

type Tool = 'select' | 'pan' | 'pen' | 'line' | 'multiline' | 'arrow' | 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'polygon' | 'cloud' | 'text' | 'dimension' | 'issue' | 'highlighter' | 'photo' | 'symbol' | 'measure';

interface Markup {
  id: string;
  tool: Tool;
  color: string;
  strokeWidth: number;
  points: { x: number; y: number }[];
  text?: string;
  page: number;
  rotation?: number;
  groupId?: string;
  opacity?: number;
  symbolId?: string;
  symbolPath?: string;
  symbolViewBox?: string;
  symbolSize?: number;
  locked?: boolean;
  zIndex?: number;
}

interface ContextMenu {
  x: number;
  y: number;
  markupId: string;
}

export function MarkupContextMenu({
  menu,
  onClose,
  onDelete,
  onBringToFront,
  onSendToBack
}: {
  menu: ContextMenu;
  onClose: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
      style={{ left: menu.x, top: menu.y }}
    >
      <button
        onClick={onBringToFront}
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
      >
        <Layers size={14} />
        Bring to Front
      </button>
      <button
        onClick={onSendToBack}
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
      >
        <Layers size={14} className="rotate-180" />
        Send to Back
      </button>
      <div className="h-px bg-gray-700 my-1" />
      <button
        onClick={onDelete}
        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );
}

export function ResizeHandles({
  markup,
  zoom,
  onResize
}: {
  markup: Markup;
  zoom: number;
  onResize: (handleIndex: number, newX: number, newY: number) => void;
}) {
  const points = markup.points;
  if (!points || points.length === 0) return null;

  const getHandles = () => {
    if (markup.tool === 'rectangle') {
      return points.map((p, i) => ({ ...p, cursor: 'move', index: i }));
    }

    if (markup.tool === 'circle') {
      if (points.length >= 2) {
        const centerX = points[0].x;
        const centerY = points[0].y;
        const radius = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);

        return [
          { x: centerX, y: centerY - radius, cursor: 'n-resize', index: 0 },
          { x: centerX + radius, y: centerY, cursor: 'e-resize', index: 1 },
          { x: centerX, y: centerY + radius, cursor: 's-resize', index: 2 },
          { x: centerX - radius, y: centerY, cursor: 'w-resize', index: 3 },
        ];
      }
    }

    if (markup.tool === 'ellipse') {
      if (points.length >= 2) {
        const centerX = (points[0].x + points[1].x) / 2;
        const centerY = (points[0].y + points[1].y) / 2;
        const radiusX = Math.abs(points[1].x - points[0].x) / 2;
        const radiusY = Math.abs(points[1].y - points[0].y) / 2;

        return [
          { x: centerX, y: centerY - radiusY, cursor: 'n-resize', index: 0 },
          { x: centerX + radiusX, y: centerY, cursor: 'e-resize', index: 1 },
          { x: centerX, y: centerY + radiusY, cursor: 's-resize', index: 2 },
          { x: centerX - radiusX, y: centerY, cursor: 'w-resize', index: 3 },
        ];
      }
    }

    if (markup.tool === 'line' || markup.tool === 'arrow') {
      return points.map((p, i) => ({ ...p, cursor: 'move', index: i }));
    }

    if (markup.tool === 'triangle') {
      if (points.length >= 3) {
        return [
          { x: points[0].x, y: points[0].y, cursor: 'move', index: 0 },
          { x: points[1].x, y: points[1].y, cursor: 'move', index: 1 },
          { x: points[2].x, y: points[2].y, cursor: 'move', index: 2 },
        ];
      } else if (points.length >= 2) {
        const p1 = points[0];
        const p2 = points[1];
        const p3x = p1.x - (p2.x - p1.x);
        return [
          { x: p1.x, y: p2.y, cursor: 'move', index: 0 },
          { x: p2.x, y: p2.y, cursor: 'move', index: 1 },
          { x: p3x, y: p1.y, cursor: 'move', index: 2 },
        ];
      }
    }

    if (markup.tool === 'polygon' || markup.tool === 'multiline') {
      return points.map((p, i) => ({ ...p, cursor: 'move', index: i }));
    }

    if (markup.tool === 'pen') {
      if (points.length <= 8) {
        return points.map((p, i) => ({ ...p, cursor: 'move', index: i }));
      }
      const step = Math.ceil(points.length / 8);
      return points
        .filter((_, i) => i % step === 0 || i === points.length - 1)
        .map((p, i) => ({ ...p, cursor: 'move', index: i * step >= points.length ? points.length - 1 : i * step }));
    }

    if (markup.tool === 'cloud') {
      return points.map((p, i) => ({ ...p, cursor: 'move', index: i }));
    }

    return points.map((p, i) => ({ ...p, cursor: 'move', index: i }));
  };

  const handles = getHandles();
  const handleSize = Math.max(8, 12 / zoom);
  const touchSize = Math.max(44, 44 / zoom);

  return (
    <>
      {handles.map((handle, i) => (
        <g key={i}>
          <rect
            x={handle.x - touchSize / 2}
            y={handle.y - touchSize / 2}
            width={touchSize}
            height={touchSize}
            fill="transparent"
            style={{ cursor: handle.cursor }}
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const startPoint = { x: handle.x, y: handle.y };

              const handleMouseMove = (moveE: MouseEvent) => {
                const dx = (moveE.clientX - startX) / zoom;
                const dy = (moveE.clientY - startY) / zoom;
                onResize(i, startPoint.x + dx, startPoint.y + dy);
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              const startX = touch.clientX;
              const startY = touch.clientY;
              const startPoint = { x: handle.x, y: handle.y };

              const handleTouchMove = (moveE: TouchEvent) => {
                const touch = moveE.touches[0];
                const dx = (touch.clientX - startX) / zoom;
                const dy = (touch.clientY - startY) / zoom;
                onResize(i, startPoint.x + dx, startPoint.y + dy);
              };

              const handleTouchEnd = () => {
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
              };

              document.addEventListener('touchmove', handleTouchMove);
              document.addEventListener('touchend', handleTouchEnd);
            }}
          />
          <rect
            x={handle.x - handleSize / 2}
            y={handle.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke="#2563eb"
            strokeWidth={2 / zoom}
            style={{ cursor: handle.cursor, pointerEvents: 'none' }}
          />
        </g>
      ))}
    </>
  );
}

export function VertexEditHandles({
  markup,
  zoom,
  onMoveVertex,
  onAddVertex,
  onDeleteVertex
}: {
  markup: Markup;
  zoom: number;
  onMoveVertex: (index: number, newX: number, newY: number) => void;
  onAddVertex: (index: number, x: number, y: number) => void;
  onDeleteVertex: (index: number) => void;
}) {
  const points = markup.points;
  if (!points || points.length === 0) return null;

  const handleSize = Math.max(10, 14 / zoom);
  const touchSize = Math.max(44, 44 / zoom);

  return (
    <>
      {points.map((point, i) => (
        <g key={`vertex-${i}`}>
          <circle
            cx={point.x}
            cy={point.y}
            r={touchSize / 2}
            fill="transparent"
            style={{ cursor: 'move' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const startPoint = { x: point.x, y: point.y };

              const handleMouseMove = (moveE: MouseEvent) => {
                const dx = (moveE.clientX - startX) / zoom;
                const dy = (moveE.clientY - startY) / zoom;
                onMoveVertex(i, startPoint.x + dx, startPoint.y + dy);
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (points.length > 2) {
                onDeleteVertex(i);
              }
            }}
          />
          <circle
            cx={point.x}
            cy={point.y}
            r={handleSize / 2}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={2 / zoom}
            style={{ pointerEvents: 'none' }}
          />
        </g>
      ))}
    </>
  );
}

export function SelectionOutline({ markup, zoom }: { markup: Markup; zoom: number }) {
  const points = markup.points;
  if (!points || points.length === 0) return null;

  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const padding = 4 / zoom;

  return (
    <rect
      x={minX - padding}
      y={minY - padding}
      width={maxX - minX + padding * 2}
      height={maxY - minY + padding * 2}
      fill="none"
      stroke="#2563eb"
      strokeWidth={2 / zoom}
      strokeDasharray={`${8 / zoom} ${4 / zoom}`}
      style={{ pointerEvents: 'none' }}
    />
  );
}

export function SymbolResizeHandles({
  markup,
  zoom,
  onResize
}: {
  markup: Markup;
  zoom: number;
  onResize: (newSize: number) => void;
}) {
  const symbolSize = markup.symbolSize || 40;
  const centerX = markup.points[0].x;
  const centerY = markup.points[0].y;

  const handles = [
    { x: centerX + symbolSize / 2, y: centerY - symbolSize / 2, cursor: 'ne-resize', corner: 'ne' },
    { x: centerX + symbolSize / 2, y: centerY + symbolSize / 2, cursor: 'se-resize', corner: 'se' },
  ];

  const handleSize = Math.max(8, 12 / zoom);
  const touchSize = Math.max(44, 44 / zoom);

  return (
    <>
      {handles.map((handle, i) => (
        <g key={i}>
          <rect
            x={handle.x - touchSize / 2}
            y={handle.y - touchSize / 2}
            width={touchSize}
            height={touchSize}
            fill="transparent"
            style={{ cursor: handle.cursor }}
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const startSize = symbolSize;

              const handleMouseMove = (moveE: MouseEvent) => {
                const dx = (moveE.clientX - startX) / zoom;
                const dy = (moveE.clientY - startY) / zoom;
                const avgDelta = (dx + dy) / 2;
                const newSize = Math.max(20, Math.min(200, startSize + avgDelta * 2));
                onResize(newSize);
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
          <circle
            cx={handle.x}
            cy={handle.y}
            r={handleSize / 2}
            fill="white"
            stroke="#3B82F6"
            strokeWidth={2 / zoom}
            style={{ pointerEvents: 'none' }}
          />
        </g>
      ))}
    </>
  );
}
