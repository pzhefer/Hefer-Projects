import { useState, useEffect, useRef } from 'react';
import {
  X, Download, ZoomIn, ZoomOut, Move, FileText, Save, Ruler,
  Pen, Square, Circle, ArrowRight, Type, MessageSquare, Triangle,
  Minus, Eye, EyeOff, RotateCcw, MousePointer2, Hexagon, Cloud, Trash2, Camera, Shapes, Magnet, AlertCircle
} from 'lucide-react';
import { supabase, type DrawingSheet, type DrawingVersion, type DrawingMarkup, type DrawingIssue } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PDFCanvasViewer from './PDFCanvasViewer';
import SVGDrawingViewer from './SVGDrawingViewer';
import DrawingPhotoAttachModal from './DrawingPhotoAttachModal';
import DrawingPhotoPinViewer from './DrawingPhotoPinViewer';
import DrawingSymbolsPalette from './DrawingSymbolsPalette';

interface EnhancedDrawingViewerProps {
  sheet: DrawingSheet;
  version: DrawingVersion;
  onClose: () => void;
  onUpdate: () => void;
}

type MarkupTool = 'select' | 'pan' | 'pen' | 'line' | 'arrow' | 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'polygon' | 'cloud' | 'text' | 'dimension' | 'issue' | 'photo' | 'symbol';

interface Markup {
  id: string;
  tool: MarkupTool;
  color: string;
  strokeWidth: number;
  points: { x: number; y: number }[];
  text?: string;
  symbolId?: string;
  symbolPath?: string;
  symbolViewBox?: string;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

interface PhotoPin {
  id: string;
  x_coordinate: number;
  y_coordinate: number;
  label: string;
  photo_id: string;
}

export default function EnhancedDrawingViewer({ sheet, version, onClose, onUpdate }: EnhancedDrawingViewerProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [currentTool, setCurrentTool] = useState<MarkupTool>('pan');
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [markups, setMarkups] = useState<Markup[]>([]);
  const [showMarkups, setShowMarkups] = useState(true);
  const [scale, setScale] = useState<number | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationLine, setCalibrationLine] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [scaleInput, setScaleInput] = useState('');
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [photoPins, setPhotoPins] = useState<PhotoPin[]>([]);
  const [showPhotoAttachModal, setShowPhotoAttachModal] = useState(false);
  const [showPhotoPinViewer, setShowPhotoPinViewer] = useState(false);
  const [photoClickPosition, setPhotoClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingAttachPosition, setPendingAttachPosition] = useState<{ x: number; y: number } | null>(null);
  const [movingPinId, setMovingPinId] = useState<string | null>(null);
  const [showSymbolsPalette, setShowSymbolsPalette] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<any | null>(null);

  // Markup selection and editing
  const [selectedMarkups, setSelectedMarkups] = useState<Set<string>>(new Set());
  const [isDraggingMarkup, setIsDraggingMarkup] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandle>(null);
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [edgePoints, setEdgePoints] = useState<{ x: number; y: number }[]>([]);
  const [snapPreview, setSnapPreview] = useState<{ x: number; y: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const colors = [
    '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FFA500',
    '#FF00FF', '#00FFFF', '#800080', '#000000', '#FFFFFF',
    '#FFC0CB', '#8B4513', '#808080', '#FFD700', '#4169E1'
  ];

  const strokeWidths = [1, 2, 3, 5, 8];

  const tools = [
    { id: 'select' as MarkupTool, icon: MousePointer2, label: 'Select' },
    { id: 'pan' as MarkupTool, icon: Move, label: 'Pan' },
    { id: 'pen' as MarkupTool, icon: Pen, label: 'Freehand' },
    { id: 'line' as MarkupTool, icon: Minus, label: 'Line' },
    { id: 'arrow' as MarkupTool, icon: ArrowRight, label: 'Arrow' },
    { id: 'rectangle' as MarkupTool, icon: Square, label: 'Rectangle' },
    { id: 'circle' as MarkupTool, icon: Circle, label: 'Circle' },
    { id: 'triangle' as MarkupTool, icon: Triangle, label: 'Triangle' },
    { id: 'polygon' as MarkupTool, icon: Hexagon, label: 'Polygon' },
    { id: 'cloud' as MarkupTool, icon: Cloud, label: 'Cloud' },
    { id: 'text' as MarkupTool, icon: Type, label: 'Text' },
    { id: 'dimension' as MarkupTool, icon: Ruler, label: 'Dimension' },
    { id: 'issue' as MarkupTool, icon: MessageSquare, label: 'Issue' },
    { id: 'photo' as MarkupTool, icon: Camera, label: 'Photo Pin' },
    { id: 'symbol' as MarkupTool, icon: Shapes, label: 'Symbols' },
  ];

  const isPDF = version.file_type === 'application/pdf';
  const isImage = version.file_type.startsWith('image/');

  if (isPDF) {
    return <SVGDrawingViewer sheet={sheet} version={version} onClose={onClose} onUpdate={onUpdate} />;
  }

  useEffect(() => {
    loadDrawing();
    fetchPhotoPins();
    fetchMarkups();
  }, [version]);

  // Handle transition from viewer to attach modal
  useEffect(() => {
    if (pendingAttachPosition && !showPhotoPinViewer) {
      setPhotoClickPosition(pendingAttachPosition);
      setShowPhotoAttachModal(true);
      setPendingAttachPosition(null);
    }
  }, [pendingAttachPosition, showPhotoPinViewer]);

  const fetchPhotoPins = async () => {
    try {
      const { data, error } = await supabase
        .from('drawing_photo_pins')
        .select('*')
        .eq('sheet_id', sheet.id);

      if (error) throw error;
      setPhotoPins(data || []);
    } catch (error) {
      console.error('Error fetching photo pins:', error);
    }
  };

  const fetchMarkups = async () => {
    try {
      const { data, error } = await supabase
        .from('drawing_markups')
        .select('*')
        .eq('sheet_id', sheet.id)
        .eq('version_id', version.id);

      if (error) throw error;

      const loadedMarkups: Markup[] = (data || []).map((dbMarkup: any) => ({
        id: dbMarkup.id,
        tool: dbMarkup.markup_type as MarkupTool,
        color: dbMarkup.color || '#FF0000',
        strokeWidth: dbMarkup.stroke_width || 2,
        points: dbMarkup.data.points || [],
        text: dbMarkup.data.text,
        symbolId: dbMarkup.data.symbolId,
        symbolPath: dbMarkup.data.symbolPath,
        symbolViewBox: dbMarkup.data.symbolViewBox,
      }));

      setMarkups(loadedMarkups);
    } catch (error) {
      console.error('Error fetching markups:', error);
    }
  };

  const saveMarkup = async (markup: Markup) => {
    try {
      const { error } = await supabase
        .from('drawing_markups')
        .upsert({
          id: markup.id,
          sheet_id: sheet.id,
          version_id: version.id,
          markup_type: markup.tool,
          color: markup.color,
          stroke_width: markup.strokeWidth,
          data: {
            points: markup.points,
            text: markup.text,
            symbolId: markup.symbolId,
            symbolPath: markup.symbolPath,
            symbolViewBox: markup.symbolViewBox,
          },
          created_by: user?.id,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving markup:', error);
      alert('Failed to save markup');
    }
  };

  const deleteMarkup = async (markupId: string) => {
    try {
      const { error } = await supabase
        .from('drawing_markups')
        .delete()
        .eq('id', markupId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting markup:', error);
    }
  };

  const handleMovePin = async (point: { x: number; y: number }) => {
    if (!movingPinId || !imageElement) return;

    const normalizedX = point.x / imageElement.width;
    const normalizedY = point.y / imageElement.height;

    try {
      const { error } = await supabase
        .from('drawing_photo_pins')
        .update({
          x_coordinate: normalizedX,
          y_coordinate: normalizedY,
        })
        .eq('id', movingPinId);

      if (error) throw error;

      setMovingPinId(null);
      setCurrentTool('select');
      fetchPhotoPins();
    } catch (error) {
      console.error('Error moving pin:', error);
      alert('Failed to move pin');
      setMovingPinId(null);
    }
  };

  const startMovingPin = (pinId: string) => {
    setMovingPinId(pinId);
    setShowPhotoPinViewer(false);
    setPhotoClickPosition(null);
    setCurrentTool('photo');
  };

  const cancelMovePin = () => {
    setMovingPinId(null);
    setCurrentTool('select');
  };

  useEffect(() => {
    if (imageElement && canvasRef.current && canvasWrapperRef.current) {
      updateCanvasSize();
      redrawCanvas();
    }
  }, [imageElement]);

  useEffect(() => {
    if (imageElement && canvasRef.current && canvasWrapperRef.current) {
      redrawCanvas();
    }
  }, [markups, showMarkups, zoom, pan, photoPins, selectedMarkups, selectionBox, snapPreview, snapEnabled, calibrationLine]);

  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageElement, markups, showMarkups, zoom, pan]);

  useEffect(() => {
    const updateViewportSize = () => {
      if (containerRef.current) {
        setViewportSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected markups
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedMarkups.size > 0) {
        e.preventDefault();
        deleteSelectedMarkups();
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedMarkups(new Set());
        setShowPropertiesPanel(false);
        setSelectionBox(null);
      }

      // Select all (Ctrl/Cmd + A)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allIds = new Set(markups.map(m => m.id));
        setSelectedMarkups(allIds);
        setShowPropertiesPanel(allIds.size > 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMarkups, markups]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastTouchDistance = 0;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom when Ctrl/Cmd is pressed (Adobe Acrobat style)
      // Or always zoom if not using Ctrl mode
      const shouldZoom = e.ctrlKey || e.metaKey || true; // Set to true for always-zoom mode

      if (!shouldZoom) return;

      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Adobe-style zoom: smaller, smoother steps
      const zoomIntensity = 0.1;
      const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
      const newZoom = Math.max(0.1, Math.min(10, zoom * (1 + delta)));

      if (newZoom === zoom) return; // No change

      // Calculate the world coordinate under the mouse (before zoom)
      const worldX = (mouseX - pan.x) / zoom;
      const worldY = (mouseY - pan.y) / zoom;

      // Calculate new pan to keep the world point under the mouse (after zoom)
      // Adobe method: pan = mouse - (world * newZoom)
      const newPanX = mouseX - worldX * newZoom;
      const newPanY = mouseY - worldY * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (lastTouchDistance > 0) {
          const rect = canvas.getBoundingClientRect();
          const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
          const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;

          // Calculate zoom scale change
          const scaleFactor = distance / lastTouchDistance;
          const newZoom = Math.max(0.1, Math.min(10, zoom * scaleFactor));

          if (newZoom !== zoom) {
            // Adobe method: calculate world coordinate under touch center
            const worldX = (centerX - pan.x) / zoom;
            const worldY = (centerY - pan.y) / zoom;

            // Keep that world point under the touch center
            const newPanX = centerX - worldX * newZoom;
            const newPanY = centerY - worldY * newZoom;

            setZoom(newZoom);
            setPan({ x: newPanX, y: newPanY });
          }
        }

        lastTouchDistance = distance;
      }
    };

    const handleTouchEnd = () => {
      lastTouchDistance = 0;
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoom, pan]);

  const loadDrawing = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase.storage
        .from('drawings')
        .createSignedUrl(version.file_url, 3600);

      if (error) throw error;
      setFileUrl(data.signedUrl);

      await loadMarkups();

      if (isImage) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setImageElement(img);
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
          setLoading(false);

          setTimeout(() => {
            fitToScreen(img.naturalWidth, img.naturalHeight);
            detectEdgePoints(img);
          }, 100);
        };
        img.onerror = () => {
          console.error('Error loading image');
          setLoadError('Failed to load image file');
          setLoading(false);
        };
        img.src = data.signedUrl;
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading drawing:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load drawing');
      setLoading(false);
    }
  };

  const detectEdgePoints = (img: HTMLImageElement) => {
    try {
      const tempCanvas = document.createElement('canvas');
      const maxSize = 1000;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      tempCanvas.width = img.width * scale;
      tempCanvas.height = img.height * scale;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
      const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;

      const edges: { x: number; y: number }[] = [];
      const threshold = 50;
      const gridSize = 20;

      for (let y = gridSize; y < tempCanvas.height - gridSize; y += gridSize) {
        for (let x = gridSize; x < tempCanvas.width - gridSize; x += gridSize) {
          const idx = (y * tempCanvas.width + x) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

          let isEdge = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nIdx = ((y + dy) * tempCanvas.width + (x + dx)) * 4;
              const nGray = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
              if (Math.abs(gray - nGray) > threshold) {
                isEdge = true;
                break;
              }
            }
            if (isEdge) break;
          }

          if (isEdge) {
            edges.push({
              x: (x / scale),
              y: (y / scale)
            });
          }
        }
      }

      setEdgePoints(edges);
    } catch (error) {
      console.error('Error detecting edges:', error);
    }
  };

  const loadMarkups = async () => {
    try {
      const { data, error } = await supabase
        .from('drawing_markups')
        .select('*')
        .eq('version_id', version.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const loadedMarkups: Markup[] = data.map(dbMarkup => ({
          id: dbMarkup.id,
          tool: dbMarkup.markup_type as MarkupTool,
          color: dbMarkup.color,
          strokeWidth: Number(dbMarkup.stroke_width),
          points: dbMarkup.data.points || [],
          text: dbMarkup.data.text
        }));
        setMarkups(loadedMarkups);
      }
    } catch (error) {
      console.error('Error loading markups:', error);
    }
  };

  const updateCanvasSize = () => {
    const canvas = canvasRef.current;
    const wrapper = canvasWrapperRef.current;
    if (!canvas || !wrapper) return;

    const newWidth = wrapper.clientWidth;
    const newHeight = wrapper.clientHeight;

    // Only resize if dimensions actually changed
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      redrawCanvas();
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const wrapper = canvasWrapperRef.current;
    if (!canvas || !imageElement || !wrapper) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw image
    ctx.drawImage(imageElement, 0, 0);

    // Draw markups
    if (showMarkups) {
      markups.forEach(markup => drawMarkup(ctx, markup));

      // Draw selection indicators
      selectedMarkups.forEach(id => {
        const markup = markups.find(m => m.id === id);
        if (!markup) return;

        const bbox = getMarkupBoundingBox(markup);

        // Draw bounding box
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.strokeRect(
          bbox.minX,
          bbox.minY,
          bbox.maxX - bbox.minX,
          bbox.maxY - bbox.minY
        );
        ctx.setLineDash([]);

        // Draw resize handles (only for single selection)
        if (selectedMarkups.size === 1) {
          const handleSize = 8 / zoom;
          const handles = [
            { x: bbox.minX, y: bbox.minY }, // nw
            { x: bbox.maxX, y: bbox.minY }, // ne
            { x: bbox.minX, y: bbox.maxY }, // sw
            { x: bbox.maxX, y: bbox.maxY }, // se
            { x: (bbox.minX + bbox.maxX) / 2, y: bbox.minY }, // n
            { x: (bbox.minX + bbox.maxX) / 2, y: bbox.maxY }, // s
            { x: bbox.minX, y: (bbox.minY + bbox.maxY) / 2 }, // w
            { x: bbox.maxX, y: (bbox.minY + bbox.maxY) / 2 }, // e
          ];

          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 1 / zoom;

          handles.forEach(handle => {
            ctx.fillRect(
              handle.x - handleSize / 2,
              handle.y - handleSize / 2,
              handleSize,
              handleSize
            );
            ctx.strokeRect(
              handle.x - handleSize / 2,
              handle.y - handleSize / 2,
              handleSize,
              handleSize
            );
          });
        }
      });
    }

    // Draw selection box
    if (selectionBox) {
      const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
      const maxX = Math.max(selectionBox.start.x, selectionBox.end.x);
      const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
      const maxY = Math.max(selectionBox.start.y, selectionBox.end.y);

      ctx.strokeStyle = '#3B82F6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);
    }

    // Draw photo pins (deduplicate by location)
    const tolerance = 0.001;
    const uniquePinLocations: PhotoPin[] = [];

    for (const pin of photoPins) {
      const existingLocation = uniquePinLocations.find(
        u => Math.abs(u.x_coordinate - pin.x_coordinate) < tolerance &&
             Math.abs(u.y_coordinate - pin.y_coordinate) < tolerance
      );

      if (!existingLocation) {
        // Prefer pins with photos over empty pins
        const pinsAtLocation = photoPins.filter(
          p => Math.abs(p.x_coordinate - pin.x_coordinate) < tolerance &&
               Math.abs(p.y_coordinate - pin.y_coordinate) < tolerance
        );
        const pinWithPhoto = pinsAtLocation.find(p => p.photo_id !== null && p.photo_id !== undefined);
        uniquePinLocations.push(pinWithPhoto || pin);
      }
    }

    uniquePinLocations.forEach(pin => {
      const pinX = pin.x_coordinate * imageElement.width;
      const pinY = pin.y_coordinate * imageElement.height;

      // Draw pin marker
      ctx.save();
      const hasPhoto = pin.photo_id !== null && pin.photo_id !== undefined;
      ctx.fillStyle = hasPhoto ? '#3B82F6' : '#9CA3AF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2 / zoom;

      // Draw camera icon background
      ctx.beginPath();
      ctx.arc(pinX, pinY, 20 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw camera icon (simplified)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${16 / zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hasPhoto ? '\ud83d\udcf7' : '\ud83d\udccd', pinX, pinY);

      // Draw label if exists
      if (pin.label) {
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3 / zoom;
        ctx.font = `${12 / zoom}px Arial`;
        ctx.strokeText(pin.label, pinX, pinY + 30 / zoom);
        ctx.fillText(pin.label, pinX, pinY + 30 / zoom);
      }

      ctx.restore();
    });

    // Draw calibration line
    if (calibrationLine) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.beginPath();
      ctx.moveTo(calibrationLine.start.x, calibrationLine.start.y);
      ctx.lineTo(calibrationLine.end.x, calibrationLine.end.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw snap preview indicator
    if (snapPreview && snapEnabled) {
      ctx.strokeStyle = '#00FF00';
      ctx.fillStyle = '#00FF00';
      ctx.lineWidth = 2 / zoom;

      // Draw crosshair
      const size = 10 / zoom;
      ctx.beginPath();
      ctx.moveTo(snapPreview.x - size, snapPreview.y);
      ctx.lineTo(snapPreview.x + size, snapPreview.y);
      ctx.moveTo(snapPreview.x, snapPreview.y - size);
      ctx.lineTo(snapPreview.x, snapPreview.y + size);
      ctx.stroke();

      // Draw circle
      ctx.beginPath();
      ctx.arc(snapPreview.x, snapPreview.y, 6 / zoom, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawMarkup = (ctx: CanvasRenderingContext2D, markup: Markup) => {
    ctx.strokeStyle = markup.color;
    ctx.fillStyle = markup.color;
    ctx.lineWidth = markup.strokeWidth / zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = markup.points;
    if (points.length === 0) return;

    switch (markup.tool) {
      case 'pen':
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();
        break;

      case 'line':
      case 'dimension':
        if (points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          ctx.lineTo(points[1].x, points[1].y);
          ctx.stroke();

          if (markup.tool === 'dimension' && scale) {
            const dx = points[1].x - points[0].x;
            const dy = points[1].y - points[0].y;
            const pixelLength = Math.sqrt(dx * dx + dy * dy);
            const realLength = (pixelLength * scale).toFixed(2);

            const midX = (points[0].x + points[1].x) / 2;
            const midY = (points[0].y + points[1].y) / 2;

            ctx.fillStyle = '#000000';
            const rectWidth = 60 / zoom;
            const rectHeight = 24 / zoom;
            ctx.fillRect(midX - rectWidth/2, midY - rectHeight/2, rectWidth, rectHeight);
            ctx.fillStyle = markup.color;
            ctx.font = `${12 / zoom}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${realLength} ft`, midX, midY);
          }
        }
        break;

      case 'arrow':
        if (points.length >= 2) {
          const start = points[0];
          const end = points[1];
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const arrowLength = 15 / zoom;

          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle - Math.PI / 6),
            end.y - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle + Math.PI / 6),
            end.y - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        break;

      case 'rectangle':
        if (points.length >= 2) {
          const width = points[1].x - points[0].x;
          const height = points[1].y - points[0].y;
          ctx.strokeRect(points[0].x, points[0].y, width, height);
        }
        break;

      case 'circle':
        if (points.length >= 2) {
          const radius = Math.sqrt(
            Math.pow(points[1].x - points[0].x, 2) +
            Math.pow(points[1].y - points[0].y, 2)
          );
          ctx.beginPath();
          ctx.arc(points[0].x, points[0].y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;

      case 'triangle':
        if (points.length >= 2) {
          const width = points[1].x - points[0].x;
          const height = points[1].y - points[0].y;
          ctx.beginPath();
          ctx.moveTo(points[0].x + width / 2, points[0].y);
          ctx.lineTo(points[0].x, points[1].y);
          ctx.lineTo(points[1].x, points[1].y);
          ctx.closePath();
          ctx.stroke();
        }
        break;

      case 'cloud':
        if (points.length >= 2) {
          const width = Math.abs(points[1].x - points[0].x);
          const height = Math.abs(points[1].y - points[0].y);
          const x = Math.min(points[0].x, points[1].x);
          const y = Math.min(points[0].y, points[1].y);

          const bumps = 8;
          ctx.beginPath();
          for (let i = 0; i <= bumps; i++) {
            const angle = (i / bumps) * Math.PI * 2;
            const radius = (width / 2) * (0.8 + 0.2 * Math.sin(angle * 4));
            const px = x + width / 2 + radius * Math.cos(angle);
            const py = y + height / 2 + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
        break;

      case 'symbol':
        if (markup.symbolPath && points.length > 0) {
          const symbolSize = 24 / zoom;
          const x = points[0].x - symbolSize / 2;
          const y = points[0].y - symbolSize / 2;

          ctx.save();
          ctx.translate(x, y);
          ctx.scale(symbolSize / 24, symbolSize / 24);

          const path = new Path2D(markup.symbolPath);
          ctx.fillStyle = markup.color;
          ctx.fill(path);

          ctx.restore();
        }
        break;

      case 'text':
        if (markup.text) {
          ctx.font = `${(markup.strokeWidth * 8) / zoom}px Arial`;
          ctx.fillText(markup.text, points[0].x, points[0].y);
        }
        break;
    }
  };

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const point = {
      x: (mouseX - pan.x) / zoom,
      y: (mouseY - pan.y) / zoom
    };

    // Apply snapping if enabled
    if (snapEnabled && currentTool !== 'select' && currentTool !== 'pan') {
      return getSnappedPoint(point);
    }

    return point;
  };

  const getSnappedPoint = (point: { x: number; y: number }) => {
    const snapRadius = 15 / zoom; // Snap within 15 pixels at current zoom
    let closestPoint = point;
    let minDistance = snapRadius;

    // Check existing markup points
    markups.forEach(markup => {
      markup.points.forEach(p => {
        const distance = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2));
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = p;
        }
      });
    });

    // Check markup line intersections
    const intersections = findMarkupIntersections();
    intersections.forEach(p => {
      const distance = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = p;
      }
    });

    // Check nearest points on markup lines
    markups.forEach(markup => {
      if (markup.tool === 'line' || markup.tool === 'arrow' || markup.tool === 'dimension') {
        if (markup.points.length >= 2) {
          const nearestPoint = getNearestPointOnLine(markup.points[0], markup.points[1], point);
          const distance = Math.sqrt(Math.pow(nearestPoint.x - point.x, 2) + Math.pow(nearestPoint.y - point.y, 2));
          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = nearestPoint;
          }
        }
      }
    });

    // Check edge points from image analysis
    edgePoints.forEach(p => {
      const distance = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = p;
      }
    });

    return closestPoint;
  };

  const getNearestPointOnLine = (lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }, point: { x: number; y: number }) => {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) return lineStart;

    let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    return {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy
    };
  };

  const findMarkupIntersections = () => {
    const intersections: { x: number; y: number }[] = [];
    const lines = markups.filter(m =>
      (m.tool === 'line' || m.tool === 'arrow' || m.tool === 'dimension') && m.points.length >= 2
    );

    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const p1 = lines[i].points[0];
        const p2 = lines[i].points[1];
        const p3 = lines[j].points[0];
        const p4 = lines[j].points[1];

        const intersection = getLineIntersection(p1, p2, p3, p4);
        if (intersection) {
          intersections.push(intersection);
        }
      }
    }

    return intersections;
  };

  const getLineIntersection = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number }
  ) => {
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null; // Parallel lines

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);

    // Handle moving an existing pin
    if (movingPinId) {
      handleMovePin(point);
      return;
    }

    // Handle photo pin tool
    if (currentTool === 'photo') {
      if (!imageElement) return;
      const normalizedX = point.x / imageElement.width;
      const normalizedY = point.y / imageElement.height;
      setPhotoClickPosition({ x: normalizedX, y: normalizedY });
      setShowPhotoAttachModal(true);
      return;
    }

    // Handle symbol placement
    if (currentTool === 'symbol' && selectedSymbol) {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: 'symbol',
        color: markupColor,
        strokeWidth: markupStrokeWidth,
        points: [point],
        symbolId: selectedSymbol.id,
        symbolPath: selectedSymbol.svg_path,
        symbolViewBox: selectedSymbol.view_box,
      };
      setMarkups([...markups, newMarkup]);
      saveMarkup(newMarkup);
      setSelectedSymbol(null);
      setCurrentTool('select');
      return;
    }

    // Check if clicking on existing photo pin (in select mode)
    if (currentTool === 'select') {
      const clickedPin = photoPins.find(pin => {
        if (!imageElement) return false;
        const pinX = pin.x_coordinate * imageElement.width;
        const pinY = pin.y_coordinate * imageElement.height;
        const distance = Math.sqrt(Math.pow(point.x - pinX, 2) + Math.pow(point.y - pinY, 2));
        return distance < 30 / zoom; // Click tolerance
      });

      if (clickedPin) {
        setPhotoClickPosition({ x: clickedPin.x_coordinate, y: clickedPin.y_coordinate });
        setShowPhotoPinViewer(true);
        return;
      }

      // Check if clicking on a markup
      const clickedMarkup = getMarkupAtPoint(point.x, point.y);

      if (clickedMarkup) {
        // Check if clicking on resize handle for selected markup
        if (selectedMarkups.has(clickedMarkup.id)) {
          const bbox = getMarkupBoundingBox(clickedMarkup);
          const handle = getResizeHandle(point.x, point.y, bbox);

          if (handle) {
            setActiveResizeHandle(handle);
            setStartPoint(point);
            return;
          }
        }

        // Multi-select with Shift key
        if (e.shiftKey) {
          const newSelection = new Set(selectedMarkups);
          if (newSelection.has(clickedMarkup.id)) {
            newSelection.delete(clickedMarkup.id);
          } else {
            newSelection.add(clickedMarkup.id);
          }
          setSelectedMarkups(newSelection);
          setShowPropertiesPanel(newSelection.size > 0);
        } else {
          // Single select (replace selection)
          if (!selectedMarkups.has(clickedMarkup.id)) {
            setSelectedMarkups(new Set([clickedMarkup.id]));
            setShowPropertiesPanel(true);
          }
        }

        // Start dragging
        setIsDraggingMarkup(true);
        setStartPoint(point);
        setDragOffset({ x: 0, y: 0 });
        return;
      }

      // Click on empty space - start selection box or clear selection
      if (!e.shiftKey) {
        setSelectedMarkups(new Set());
        setShowPropertiesPanel(false);
      }
      setSelectionBox({ start: point, end: point });
      setIsDrawing(true);
      setStartPoint(point);
      return;
    }

    if (isCalibrating) {
      if (!calibrationLine) {
        setCalibrationLine({ start: point, end: point });
      } else {
        setCalibrationLine({ ...calibrationLine, end: point });
        setShowScaleDialog(true);
      }
      return;
    }

    if (currentTool === 'pan') {
      setIsPanning(true);
      const wrapper = canvasWrapperRef.current;
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        setStartPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      return;
    }

    setIsDrawing(true);
    setStartPoint(point);

    if (currentTool === 'pen') {
      setCurrentPath([point]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const rawPoint = {
      x: (mouseX - pan.x) / zoom,
      y: (mouseY - pan.y) / zoom
    };

    // Update snap preview
    if (snapEnabled && currentTool !== 'select' && currentTool !== 'pan' && !isDrawing) {
      const snappedPoint = getSnappedPoint(rawPoint);
      if (snappedPoint.x !== rawPoint.x || snappedPoint.y !== rawPoint.y) {
        setSnapPreview(snappedPoint);
      } else {
        setSnapPreview(null);
      }
    } else {
      setSnapPreview(null);
    }

    const point = getCanvasPoint(e);

    // Handle dragging selected markups
    if (isDraggingMarkup && startPoint && !activeResizeHandle) {
      const dx = point.x - startPoint.x;
      const dy = point.y - startPoint.y;

      const updatedMarkups = markups.map(m => {
        if (selectedMarkups.has(m.id)) {
          return {
            ...m,
            points: m.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
          };
        }
        return m;
      });

      setMarkups(updatedMarkups);
      setStartPoint(point);
      return;
    }

    // Handle resizing selected markup
    if (activeResizeHandle && startPoint && selectedMarkups.size === 1) {
      const selectedId = Array.from(selectedMarkups)[0];
      const markup = markups.find(m => m.id === selectedId);
      if (!markup) return;

      const dx = point.x - startPoint.x;
      const dy = point.y - startPoint.y;

      const updatedMarkups = markups.map(m => {
        if (m.id === selectedId) {
          const bbox = getMarkupBoundingBox(m);
          const newPoints = [...m.points];

          // Update points based on resize handle
          if (activeResizeHandle.includes('e')) {
            newPoints.forEach(p => {
              if (p.x >= bbox.maxX - 1) p.x += dx;
            });
          }
          if (activeResizeHandle.includes('w')) {
            newPoints.forEach(p => {
              if (p.x <= bbox.minX + 1) p.x += dx;
            });
          }
          if (activeResizeHandle.includes('s')) {
            newPoints.forEach(p => {
              if (p.y >= bbox.maxY - 1) p.y += dy;
            });
          }
          if (activeResizeHandle.includes('n')) {
            newPoints.forEach(p => {
              if (p.y <= bbox.minY + 1) p.y += dy;
            });
          }

          return { ...m, points: newPoints };
        }
        return m;
      });

      setMarkups(updatedMarkups);
      setStartPoint(point);
      return;
    }

    // Handle selection box
    if (currentTool === 'select' && isDrawing && selectionBox) {
      setSelectionBox({ start: selectionBox.start, end: point });
      redrawCanvas();
      return;
    }

    if (!isDrawing && !isPanning && !isCalibrating) return;

    if (isCalibrating && calibrationLine && !showScaleDialog) {
      setCalibrationLine({ ...calibrationLine, end: point });
      redrawCanvas();
      return;
    }

    if (isPanning && startPoint) {
      const wrapper = canvasWrapperRef.current;
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const currentScreenX = e.clientX - rect.left;
        const currentScreenY = e.clientY - rect.top;
        const dx = currentScreenX - startPoint.x;
        const dy = currentScreenY - startPoint.y;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setStartPoint({ x: currentScreenX, y: currentScreenY });
      }
      return;
    }

    if (!startPoint) return;

    if (currentTool === 'pen') {
      setCurrentPath(prev => [...prev, point]);
      const tempMarkup: Markup = {
        id: 'temp',
        tool: 'pen',
        color: currentColor,
        strokeWidth: strokeWidth,
        points: [...currentPath, point]
      };
      redrawCanvas();
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawMarkup(ctx, tempMarkup);
    } else if (currentTool !== 'select') {
      const tempMarkup: Markup = {
        id: 'temp',
        tool: currentTool,
        color: currentColor,
        strokeWidth: strokeWidth,
        points: [startPoint, point]
      };
      redrawCanvas();
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawMarkup(ctx, tempMarkup);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      setStartPoint(null);
      return;
    }

    // End markup dragging
    if (isDraggingMarkup) {
      setIsDraggingMarkup(false);
      setStartPoint(null);
      setDragOffset(null);

      // Save updated markups to database
      selectedMarkups.forEach(id => {
        const markup = markups.find(m => m.id === id);
        if (markup) saveMarkup(markup);
      });
      return;
    }

    // End resizing
    if (activeResizeHandle) {
      setActiveResizeHandle(null);
      setStartPoint(null);

      // Save updated markup to database
      selectedMarkups.forEach(id => {
        const markup = markups.find(m => m.id === id);
        if (markup) saveMarkup(markup);
      });
      return;
    }

    // Handle selection box completion
    if (currentTool === 'select' && selectionBox) {
      const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
      const maxX = Math.max(selectionBox.start.x, selectionBox.end.x);
      const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
      const maxY = Math.max(selectionBox.start.y, selectionBox.end.y);

      const selectedIds = new Set<string>();
      markups.forEach(markup => {
        const bbox = getMarkupBoundingBox(markup);
        // Check if markup bbox intersects with selection box
        if (bbox.maxX >= minX && bbox.minX <= maxX && bbox.maxY >= minY && bbox.minY <= maxY) {
          selectedIds.add(markup.id);
        }
      });

      if (e.shiftKey) {
        const newSelection = new Set([...selectedMarkups, ...selectedIds]);
        setSelectedMarkups(newSelection);
        setShowPropertiesPanel(newSelection.size > 0);
      } else {
        setSelectedMarkups(selectedIds);
        setShowPropertiesPanel(selectedIds.size > 0);
      }

      setSelectionBox(null);
      setIsDrawing(false);
      setStartPoint(null);
      return;
    }

    if (!isDrawing || !startPoint) return;

    const point = getCanvasPoint(e);

    if (currentTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const newMarkup: Markup = {
          id: crypto.randomUUID(),
          tool: 'text',
          color: currentColor,
          strokeWidth: strokeWidth,
          points: [point],
          text: text
        };
        setMarkups(prev => [...prev, newMarkup]);
        saveMarkup(newMarkup);
      }
    } else if (currentTool === 'pen') {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: 'pen',
        color: currentColor,
        strokeWidth: strokeWidth,
        points: currentPath
      };
      setMarkups(prev => [...prev, newMarkup]);
      saveMarkup(newMarkup);
      setCurrentPath([]);
    } else if (currentTool !== 'select') {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: currentTool,
        color: currentColor,
        strokeWidth: strokeWidth,
        points: [startPoint, point]
      };
      setMarkups(prev => [...prev, newMarkup]);
      saveMarkup(newMarkup);
    }

    setIsDrawing(false);
    setStartPoint(null);
  };

  const fitToScreen = (imgWidth?: number, imgHeight?: number) => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;

    const width = imgWidth || naturalSize.width;
    const height = imgHeight || naturalSize.height;

    if (!width || !height) return;

    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;

    // Calculate zoom to fit with 10% padding
    const scaleX = (wrapperWidth * 0.9) / width;
    const scaleY = (wrapperHeight * 0.9) / height;
    const newZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

    // Center the image
    const newPanX = (wrapperWidth - width * newZoom) / 2;
    const newPanY = (wrapperHeight - height * newZoom) / 2;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomIn = () => {
    if (!canvasWrapperRef.current) return;

    // Zoom toward center of viewport
    const centerX = canvasWrapperRef.current.clientWidth / 2;
    const centerY = canvasWrapperRef.current.clientHeight / 2;

    // Adobe-style: zoom by 25% steps
    const newZoom = Math.min(zoom * 1.25, 10);

    if (newZoom === zoom) return;

    // Calculate world coordinate at viewport center
    const worldX = (centerX - pan.x) / zoom;
    const worldY = (centerY - pan.y) / zoom;

    // Keep world point at viewport center after zoom
    const newPanX = centerX - worldX * newZoom;
    const newPanY = centerY - worldY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomOut = () => {
    if (!canvasWrapperRef.current) return;

    // Zoom toward center of viewport
    const centerX = canvasWrapperRef.current.clientWidth / 2;
    const centerY = canvasWrapperRef.current.clientHeight / 2;

    // Adobe-style: zoom by 20% steps
    const newZoom = Math.max(zoom * 0.8, 0.1);

    if (newZoom === zoom) return;

    // Calculate world coordinate at viewport center
    const worldX = (centerX - pan.x) / zoom;
    const worldY = (centerY - pan.y) / zoom;

    // Keep world point at viewport center after zoom
    const newPanX = centerX - worldX * newZoom;
    const newPanY = centerY - worldY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleResetView = () => {
    fitToScreen();
  };

  // Markup selection and editing utilities
  const getMarkupBoundingBox = (markup: Markup): BoundingBox => {
    if (markup.points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = markup.points[0].x;
    let minY = markup.points[0].y;
    let maxX = markup.points[0].x;
    let maxY = markup.points[0].y;

    markup.points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    // Add padding based on stroke width
    const padding = markup.strokeWidth / zoom;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding
    };
  };

  const isPointInMarkup = (x: number, y: number, markup: Markup): boolean => {
    const bbox = getMarkupBoundingBox(markup);
    return x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY;
  };

  const getMarkupAtPoint = (x: number, y: number): Markup | null => {
    // Search in reverse order (topmost markup first)
    for (let i = markups.length - 1; i >= 0; i--) {
      if (isPointInMarkup(x, y, markups[i])) {
        return markups[i];
      }
    }
    return null;
  };

  const getResizeHandle = (x: number, y: number, bbox: BoundingBox): ResizeHandle => {
    const handleSize = 8 / zoom;
    const tolerance = handleSize / 2;

    // Check corners first
    if (Math.abs(x - bbox.minX) < tolerance && Math.abs(y - bbox.minY) < tolerance) return 'nw';
    if (Math.abs(x - bbox.maxX) < tolerance && Math.abs(y - bbox.minY) < tolerance) return 'ne';
    if (Math.abs(x - bbox.minX) < tolerance && Math.abs(y - bbox.maxY) < tolerance) return 'sw';
    if (Math.abs(x - bbox.maxX) < tolerance && Math.abs(y - bbox.maxY) < tolerance) return 'se';

    // Check edges
    if (Math.abs(x - bbox.minX) < tolerance && y >= bbox.minY && y <= bbox.maxY) return 'w';
    if (Math.abs(x - bbox.maxX) < tolerance && y >= bbox.minY && y <= bbox.maxY) return 'e';
    if (Math.abs(y - bbox.minY) < tolerance && x >= bbox.minX && x <= bbox.maxX) return 'n';
    if (Math.abs(y - bbox.maxY) < tolerance && x >= bbox.minX && x <= bbox.maxX) return 's';

    return null;
  };

  const deleteSelectedMarkups = () => {
    if (selectedMarkups.size === 0) return;

    // Delete from database
    selectedMarkups.forEach(id => deleteMarkup(id));

    const updatedMarkups = markups.filter(m => !selectedMarkups.has(m.id));
    setMarkups(updatedMarkups);
    setSelectedMarkups(new Set());
    setShowPropertiesPanel(false);
  };

  const updateSelectedMarkupsColor = (color: string) => {
    const updatedMarkups = markups.map(m =>
      selectedMarkups.has(m.id) ? { ...m, color } : m
    );
    setMarkups(updatedMarkups);

    // Save updated markups to database
    updatedMarkups.forEach(m => {
      if (selectedMarkups.has(m.id)) saveMarkup(m);
    });
  };

  const updateSelectedMarkupsStrokeWidth = (width: number) => {
    const updatedMarkups = markups.map(m =>
      selectedMarkups.has(m.id) ? { ...m, strokeWidth: width } : m
    );
    setMarkups(updatedMarkups);

    // Save updated markups to database
    updatedMarkups.forEach(m => {
      if (selectedMarkups.has(m.id)) saveMarkup(m);
    });
  };

  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationLine(null);
    setCurrentTool('select');
  };

  const finishCalibration = () => {
    if (scaleInput && calibrationLine) {
      const dx = calibrationLine.end.x - calibrationLine.start.x;
      const dy = calibrationLine.end.y - calibrationLine.start.y;
      const pixelLength = Math.sqrt(dx * dx + dy * dy);
      const realLength = parseFloat(scaleInput);

      if (realLength > 0 && pixelLength > 0) {
        setScale(realLength / pixelLength);
      }
    }
    setIsCalibrating(false);
    setCalibrationLine(null);
    setShowScaleDialog(false);
    setScaleInput('');
  };

  const clearMarkups = async () => {
    if (confirm('Clear all markups? This will permanently delete all annotations on this drawing version.')) {
      try {
        const { error } = await supabase
          .from('drawing_markups')
          .delete()
          .eq('version_id', version.id);

        if (error) throw error;

        setMarkups([]);
      } catch (error) {
        console.error('Error clearing markups:', error);
        alert('Failed to clear markups. Please try again.');
      }
    }
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('drawings')
        .download(version.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = version.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Top Toolbar */}
      <div className="bg-gray-800 text-white p-2 lg:p-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-2 lg:space-x-4 min-w-0">
          <FileText size={18} className="flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs lg:text-sm font-semibold truncate">
              {sheet.sheet_number} - v{version.version_number}
            </h2>
            <p className="text-xs text-gray-400 truncate hidden sm:block">{sheet.sheet_name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1 lg:space-x-2">
          {isImage && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-1.5 lg:p-2 hover:bg-gray-700 rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-medium w-10 lg:w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 lg:p-2 hover:bg-gray-700 rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={handleResetView}
                className="p-1.5 lg:p-2 hover:bg-gray-700 rounded transition-colors hidden sm:block"
                title="Reset View"
              >
                <RotateCcw size={16} />
              </button>
              <div className="h-4 lg:h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>
            </>
          )}

          {scale && (
            <span className="text-xs bg-green-600 px-2 py-1 rounded hidden lg:inline">
              Scale: 1px = {scale.toFixed(4)} ft
            </span>
          )}

          <button
            onClick={startCalibration}
            className={`px-2 lg:px-3 py-1 text-xs rounded transition-colors hidden md:flex items-center ${
              isCalibrating ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <Ruler size={14} className="lg:mr-1" />
            <span className="hidden lg:inline">{isCalibrating ? 'Calibrating...' : 'Set Scale'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 lg:px-3 lg:py-1 text-xs bg-blue-600 rounded hover:bg-blue-700 transition-colors flex items-center"
            title="Download"
          >
            <Download size={14} />
            <span className="hidden lg:inline lg:ml-1">Download</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 lg:p-2 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-2 flex items-center space-x-2 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {movingPinId && (
          <div className="flex-1 flex items-center justify-between space-x-3 text-blue-400 bg-blue-900 bg-opacity-30 px-4 py-3 rounded-lg mx-4">
            <div className="flex items-center space-x-3">
              <Camera size={20} />
              <div className="text-left">
                <p className="text-sm font-semibold mb-1">Moving Photo Pin</p>
                <p className="text-xs text-blue-300">Click on the drawing where you want to move this pin</p>
              </div>
            </div>
            <button
              onClick={cancelMovePin}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
        {!isImage && !movingPinId && (
          <div className="flex-1 flex items-center justify-center space-x-3 text-yellow-400 bg-yellow-900 bg-opacity-30 px-4 py-3 rounded-lg mx-4">
            <FileText size={20} />
            <div className="text-left">
              <p className="text-sm font-semibold mb-1">Markup tools are not available for PDF files</p>
              <p className="text-xs text-yellow-300">To annotate this drawing, please convert the PDF to an image format (PNG, JPG, or TIFF) and upload it as a new version.</p>
            </div>
          </div>
        )}
        {isImage && !movingPinId && (
          <>
          {tools.map(tool => {
            const ToolIcon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  if (tool.id === 'symbol') {
                    setShowSymbolsPalette(true);
                  } else {
                    setCurrentTool(tool.id);
                    setIsCalibrating(false);
                  }
                }}
                className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors ${
                  currentTool === tool.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={tool.label}
              >
                <ToolIcon size={16} />
                <span className="hidden sm:inline">{tool.label}</span>
              </button>
            );
          })}

          <div className="h-6 w-px bg-gray-600 mx-1"></div>

          {/* Color Picker */}
          <div className="flex items-center space-x-1 bg-gray-700 rounded px-2 py-1">
            <span className="text-xs text-gray-300 mr-1">Color:</span>
            {colors.slice(0, 8).map(color => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={`w-6 h-6 rounded border-2 transition-all ${
                  currentColor === color ? 'border-white scale-110' : 'border-gray-600'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* Stroke Width */}
          <div className="flex items-center space-x-1 bg-gray-700 rounded px-2 py-1">
            <span className="text-xs text-gray-300 mr-1">Width:</span>
            {strokeWidths.map(width => (
              <button
                key={width}
                onClick={() => setStrokeWidth(width)}
                className={`px-2 py-1 rounded text-xs ${
                  strokeWidth === width ? 'bg-blue-600 text-white' : 'hover:bg-gray-600'
                }`}
              >
                {width}px
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-600 mx-1"></div>

          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`flex items-center space-x-1 px-3 py-2 rounded text-xs font-medium flex-shrink-0 ${
              snapEnabled ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={snapEnabled ? 'Snap Enabled: Points snap to intersections and lines' : 'Snap Disabled'}
          >
            <Magnet size={16} />
            <span>Snap</span>
          </button>

          <button
            onClick={() => setShowMarkups(!showMarkups)}
            className={`flex items-center space-x-1 px-3 py-2 rounded text-xs ${
              showMarkups ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Toggle Markups"
          >
            {showMarkups ? <Eye size={16} /> : <EyeOff size={16} />}
            <span className="hidden sm:inline">Markups</span>
          </button>

          <button
            onClick={clearMarkups}
            className="flex items-center space-x-1 px-3 py-2 rounded text-xs bg-red-600 hover:bg-red-700"
            title="Clear All Markups"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Clear</span>
          </button>
          </>
        )}
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden bg-gray-900 p-4" style={{ touchAction: 'none' }}>
        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-white">Loading drawing...</p>
          </div>
        ) : loadError ? (
          <div className="text-center max-w-md mx-auto p-6 bg-red-900 bg-opacity-50 rounded-lg">
            <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
            <h3 className="text-xl font-bold text-white mb-2">Failed to Load Drawing</h3>
            <p className="text-red-200 mb-4">{loadError}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={loadDrawing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : isPDF ? (
          <div className="w-full h-full">
            <object
              data={fileUrl}
              type="application/pdf"
              className="w-full h-full"
            >
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileText className="mx-auto text-gray-400 mb-4" size={64} />
                <p className="text-white mb-2">PDF preview unavailable</p>
                <button
                  onClick={handleDownload}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Download size={20} />
                  <span>Download PDF</span>
                </button>
              </div>
            </object>
          </div>
        ) : isImage ? (
          <div
            ref={canvasWrapperRef}
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{
                cursor: currentTool === 'pan' || isPanning ? 'grab' : 'crosshair',
                width: '100%',
                height: '100%',
              }}
              className="shadow-2xl"
            />
          </div>
        ) : (
          <div className="text-center text-white">
            <p>Unsupported file type</p>
            <button
              onClick={handleDownload}
              className="mt-4 bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Download File
            </button>
          </div>
        )}
      </div>

      {/* Scale Calibration Dialog */}
      {showScaleDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Set Scale</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the real-world length of the line you drew:
            </p>
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="number"
                value={scaleInput}
                onChange={(e) => setScaleInput(e.target.value)}
                placeholder="e.g., 10"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                autoFocus
              />
              <span className="text-sm text-gray-600">feet</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowScaleDialog(false);
                  setIsCalibrating(false);
                  setCalibrationLine(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={finishCalibration}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Set Scale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Markups Sidebar */}
      <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto text-white">
        {/* Selection Properties Panel */}
        {selectedMarkups.size > 0 && (
          <div className="p-4 border-b border-gray-700 bg-gray-750">
            <h3 className="text-lg font-bold mb-3">
              Properties ({selectedMarkups.size} selected)
            </h3>

            {/* Color Picker */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="grid grid-cols-5 gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => updateSelectedMarkupsColor(color)}
                    className="w-8 h-8 rounded border-2 border-gray-600 hover:border-white transition-colors"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Stroke Width */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Stroke Width</label>
              <div className="flex gap-2">
                {strokeWidths.map(width => (
                  <button
                    key={width}
                    onClick={() => updateSelectedMarkupsStrokeWidth(width)}
                    className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
                  >
                    {width}px
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={deleteSelectedMarkups}
                className="flex-1 px-4 py-2 bg-red-600 rounded hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
              <button
                onClick={() => {
                  setSelectedMarkups(new Set());
                  setShowPropertiesPanel(false);
                }}
                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
              >
                Clear
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-3">
              Tip: Hold Shift to select multiple markups. Press Delete or Backspace to remove.
            </p>
          </div>
        )}

        {/* Markups List */}
        <div className="p-4">
          <h3 className="text-lg font-bold mb-4">Markups ({markups.length})</h3>
          {markups.length === 0 ? (
            <p className="text-sm text-gray-400">No markups yet. Use the tools to add annotations.</p>
          ) : (
            <div className="space-y-2">
              {markups.map((markup) => (
                <div
                  key={markup.id}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      const newSelection = new Set(selectedMarkups);
                      if (newSelection.has(markup.id)) {
                        newSelection.delete(markup.id);
                      } else {
                        newSelection.add(markup.id);
                      }
                      setSelectedMarkups(newSelection);
                    } else {
                      setSelectedMarkups(new Set([markup.id]));
                    }
                    setShowPropertiesPanel(true);
                  }}
                  className={`bg-gray-700 rounded p-3 flex items-start justify-between cursor-pointer hover:bg-gray-600 transition-colors ${
                    selectedMarkups.has(markup.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">{markup.tool}</p>
                    <p className="text-xs text-gray-400">
                      Color: <span style={{ color: markup.color }}>{markup.color}</span>
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMarkups(prev => prev.filter(m => m.id !== markup.id));
                      const newSelection = new Set(selectedMarkups);
                      newSelection.delete(markup.id);
                      setSelectedMarkups(newSelection);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Photo Attach Modal */}
      {showPhotoAttachModal && photoClickPosition && (
        <DrawingPhotoAttachModal
          sheetId={sheet.id}
          projectId={sheet.project_id}
          x={photoClickPosition.x}
          y={photoClickPosition.y}
          onClose={() => {
            setShowPhotoAttachModal(false);
            setPhotoClickPosition(null);
          }}
          onSuccess={() => {
            fetchPhotoPins();
            setShowPhotoAttachModal(false);
            setPhotoClickPosition(null);
          }}
        />
      )}

      {/* Photo Pin Viewer */}
      {(() => {
        console.log('Rendering DrawingPhotoPinViewer', {
          showPhotoPinViewer,
          photoClickPosition,
          startMovingPin: typeof startMovingPin,
        });
        return showPhotoPinViewer && photoClickPosition && (
          <DrawingPhotoPinViewer
            sheetId={sheet.id}
            x={photoClickPosition.x}
            y={photoClickPosition.y}
            onClose={() => {
              setShowPhotoPinViewer(false);
              setPhotoClickPosition(null);
            }}
            onUpdate={fetchPhotoPins}
            onAddMore={() => {
              // Save position and close viewer, useEffect will handle opening attach modal
              setPendingAttachPosition(photoClickPosition);
              setShowPhotoPinViewer(false);
            }}
            onMovePin={startMovingPin}
          />
        );
      })()}

      {/* Symbols Palette */}
      {showSymbolsPalette && (
        <DrawingSymbolsPalette
          onSelectSymbol={(symbol) => {
            setSelectedSymbol(symbol);
            setCurrentTool('symbol');
            setShowSymbolsPalette(false);
          }}
          onClose={() => setShowSymbolsPalette(false)}
        />
      )}
    </div>
  );
}
