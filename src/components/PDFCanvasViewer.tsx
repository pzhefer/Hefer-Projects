import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { X, Download, ZoomIn, ZoomOut, Move, FileText, Ruler, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pen, Square, Circle, ArrowRight, Type, MessageSquare, Triangle, Highlighter, Minus, Eye, EyeOff, RotateCcw, MousePointer2, Hexagon, Cloud, Trash2, CreditCard as Edit3, Undo, Redo, Camera, Shapes } from 'lucide-react';
import { supabase, type DrawingSheet, type DrawingVersion } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DrawingPhotoAttachModal from './DrawingPhotoAttachModal';
import DrawingPhotoPinViewer from './DrawingPhotoPinViewer';
import DrawingSymbolsPalette from './DrawingSymbolsPalette';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface PDFCanvasViewerProps {
  sheet: DrawingSheet;
  version: DrawingVersion;
  onClose: () => void;
  onUpdate: () => void;
}

type MarkupTool = 'select' | 'pan' | 'zoom-area' | 'pen' | 'line' | 'multiline' | 'arrow' | 'rectangle' | 'circle' | 'triangle' | 'polygon' | 'cloud' | 'text' | 'dimension' | 'issue' | 'highlighter' | 'photo' | 'symbol';

interface PhotoPin {
  id: string;
  x_coordinate: number;
  y_coordinate: number;
  label: string;
  photo_id: string;
}

interface Markup {
  id: string;
  tool: MarkupTool;
  color: string;
  strokeWidth: number;
  points: { x: number; y: number }[];
  text?: string;
  textSize?: number;
  page: number;
  opacity?: number;
  symbolId?: string;
  symbolPath?: string;
  symbolViewBox?: string;
}

export default function PDFCanvasViewer({ sheet, version, onClose, onUpdate }: PDFCanvasViewerProps) {
  const { user } = useAuth();
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const markupCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [fileUrl, setFileUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageRendering, setPageRendering] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [currentTool, setCurrentTool] = useState<MarkupTool>('pan');
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [textSize, setTextSize] = useState(16);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [markups, setMarkups] = useState<Markup[]>([]);
  const [showMarkups, setShowMarkups] = useState(true);
  const [selectedMarkupId, setSelectedMarkupId] = useState<string | null>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationLine, setCalibrationLine] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [scaleInput, setScaleInput] = useState('');
  const [scaleUnit, setScaleUnit] = useState('mm');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
  const [showToolbar, setShowToolbar] = useState(true);
  const [zoomAreaStart, setZoomAreaStart] = useState<{ x: number; y: number } | null>(null);
  const [zoomAreaEnd, setZoomAreaEnd] = useState<{ x: number; y: number } | null>(null);
  const [viewTransform, setViewTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const [isDraggingMarkup, setIsDraggingMarkup] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [multiLinePoints, setMultiLinePoints] = useState<{ x: number; y: number }[]>([]);
  const [markupHistory, setMarkupHistory] = useState<Markup[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showLineDropdown, setShowLineDropdown] = useState(false);
  const [showShapeDropdown, setShowShapeDropdown] = useState(false);
  const lineButtonRef = useRef<HTMLButtonElement>(null);
  const shapeButtonRef = useRef<HTMLButtonElement>(null);
  const [markupMoved, setMarkupMoved] = useState(false);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPoint, setTextPoint] = useState<{ x: number; y: number } | null>(null);
  const [textToolType, setTextToolType] = useState<'text' | 'issue'>('text');
  const [photoPins, setPhotoPins] = useState<PhotoPin[]>([]);
  const [showSymbolsPalette, setShowSymbolsPalette] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<any | null>(null);
  const [showPhotoAttachModal, setShowPhotoAttachModal] = useState(false);
  const [showPhotoPinViewer, setShowPhotoPinViewer] = useState(false);
  const [photoClickPosition, setPhotoClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingAttachPosition, setPendingAttachPosition] = useState<{ x: number; y: number } | null>(null);
  const [movingPinId, setMovingPinId] = useState<string | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [isDraggingPin, setIsDraggingPin] = useState(false);
  const [draggedPinId, setDraggedPinId] = useState<string | null>(null);

  const colors = [
    '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FFA500',
    '#FF00FF', '#00FFFF', '#800080', '#000000', '#FFFFFF',
    '#FFC0CB', '#8B4513', '#808080', '#FFD700', '#4169E1'
  ];

  const strokeWidths = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20];
  const textSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32];

  const tools = [
    { id: 'select' as MarkupTool, icon: MousePointer2, label: 'Select' },
    { id: 'pan' as MarkupTool, icon: Move, label: 'Pan' },
    { id: 'zoom-area' as MarkupTool, icon: ZoomIn, label: 'Zoom Area' },
    { id: 'pen' as MarkupTool, icon: Pen, label: 'Freehand' },
    { id: 'line' as MarkupTool, icon: Minus, label: 'Line' },
    { id: 'multiline' as MarkupTool, icon: Edit3, label: 'Multi-Line' },
    { id: 'arrow' as MarkupTool, icon: ArrowRight, label: 'Arrow' },
    { id: 'rectangle' as MarkupTool, icon: Square, label: 'Rectangle' },
    { id: 'circle' as MarkupTool, icon: Circle, label: 'Circle' },
    { id: 'triangle' as MarkupTool, icon: Triangle, label: 'Triangle' },
    { id: 'polygon' as MarkupTool, icon: Hexagon, label: 'Polygon' },
    { id: 'cloud' as MarkupTool, icon: Cloud, label: 'Cloud' },
    { id: 'highlighter' as MarkupTool, icon: Highlighter, label: 'Highlighter' },
    { id: 'text' as MarkupTool, icon: Type, label: 'Text' },
    { id: 'dimension' as MarkupTool, icon: Ruler, label: 'Dimension' },
    { id: 'issue' as MarkupTool, icon: MessageSquare, label: 'Issue' },
    { id: 'photo' as MarkupTool, icon: Camera, label: 'Photo Pin' },
    { id: 'symbol' as MarkupTool, icon: Shapes, label: 'Symbols' },
  ];

  useEffect(() => {
    // Reset zoom and pan when loading a new drawing
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    loadPDF();
    fetchPhotoPins();
  }, [version]);

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

  const startMovingPin = (pinId: string) => {
    setMovingPinId(pinId);
    setShowPhotoPinViewer(false);
    setPhotoClickPosition(null);
    setCurrentTool('photo');
    alert('Click on the drawing where you want to move this pin');
  };

  const handleMovePin = async (x: number, y: number) => {
    if (!movingPinId) return;

    try {
      const { error } = await supabase
        .from('drawing_photo_pins')
        .update({
          x_coordinate: x,
          y_coordinate: y,
        })
        .eq('id', movingPinId);

      if (error) throw error;

      setMovingPinId(null);
      setCurrentTool('select');
      fetchPhotoPins();
      alert('Pin moved successfully!');
    } catch (error) {
      console.error('Error moving pin:', error);
      alert('Failed to move pin');
    }
  };

  const handlePinActionClick = async (pin: PhotoPin, action: string) => {
    if (action === 'add') {
      // Open photo attach modal at pin location
      setPhotoClickPosition({ x: pin.x_coordinate, y: pin.y_coordinate });
      setShowPhotoAttachModal(true);
    } else if (action === 'view') {
      // Open photo viewer to display photos
      setPhotoClickPosition({ x: pin.x_coordinate, y: pin.y_coordinate });
      setShowPhotoPinViewer(true);
    } else if (action === 'edit') {
      // Prompt for new label
      const newLabel = prompt('Enter pin label:', pin.label || '');
      if (newLabel !== null) {
        try {
          const { error } = await supabase
            .from('drawing_photo_pins')
            .update({ label: newLabel })
            .eq('id', pin.id);

          if (error) throw error;
          fetchPhotoPins();
        } catch (error) {
          console.error('Error updating pin label:', error);
          alert('Failed to update label');
        }
      }
    } else if (action === 'delete') {
      if (confirm('Delete this photo pin and all its attached photos?')) {
        try {
          const { error } = await supabase
            .from('drawing_photo_pins')
            .delete()
            .eq('id', pin.id);

          if (error) throw error;
          setSelectedPinId(null);
          fetchPhotoPins();
        } catch (error) {
          console.error('Error deleting pin:', error);
          alert('Failed to delete pin');
        }
      }
    }
  };

  // Handle pendingAttachPosition
  useEffect(() => {
    if (pendingAttachPosition) {
      setShowPhotoAttachModal(true);
      setPhotoClickPosition(pendingAttachPosition);
      setPendingAttachPosition(null);
    }
  }, [pendingAttachPosition]);

  useEffect(() => {
    if (markupHistory.length === 0) {
      setMarkupHistory([[]]);
      setHistoryIndex(0);
    }
  }, []);

  useEffect(() => {
    if (pdfDocument) {
      // Small delay to ensure container has dimensions
      setTimeout(() => renderPage(currentPage), 100);
    }
  }, [pdfDocument, currentPage, zoom]);

  useEffect(() => {
    redrawMarkups();
  }, [markups, showMarkups, currentPage, selectedMarkupId, photoPins]);

  // Handle window resize to refit the PDF
  useEffect(() => {
    const handleResize = () => {
      if (pdfDocument) {
        renderPage(currentPage);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDocument, currentPage, zoom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (polygonPoints.length > 0) {
          setPolygonPoints([]);
        }
        if (multiLinePoints.length > 0) {
          setMultiLinePoints([]);
        }
        setSelectedMarkupId(null);
        setIsDraggingMarkup(false);
        setDragOffset(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [polygonPoints, multiLinePoints]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const canvas = markupCanvasRef.current;
      const containerDiv = container;
      if (!canvas || !containerDiv) return;

      const containerRect = containerDiv.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      const mouseXInContainer = e.clientX - containerRect.left;
      const mouseYInContainer = e.clientY - containerRect.top;

      const mouseXInCanvas = e.clientX - canvasRect.left;
      const mouseYInCanvas = e.clientY - canvasRect.top;

      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      const newZoom = Math.max(0.25, Math.min(5, zoom + delta));

      if (newZoom !== zoom) {
        const zoomRatio = newZoom / zoom;

        const newMouseXInCanvas = mouseXInCanvas * zoomRatio;
        const newMouseYInCanvas = mouseYInCanvas * zoomRatio;

        const deltaX = mouseXInCanvas - newMouseXInCanvas;
        const deltaY = mouseYInCanvas - newMouseYInCanvas;

        setPanOffset(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));

        setZoom(newZoom);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, panOffset]);

  // Touch event handlers for mobile pinch-to-zoom and pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastTouchDistance = 0;
    let lastTouchCenter = { x: 0, y: 0 };
    let isTouchZooming = false;

    const getTouchDistance = (touch1: Touch, touch2: Touch) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touch1: Touch, touch2: Touch) => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isTouchZooming = true;
        lastTouchDistance = getTouchDistance(e.touches[0], e.touches[1]);
        lastTouchCenter = getTouchCenter(e.touches[0], e.touches[1]);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isTouchZooming) {
        e.preventDefault();

        const canvas = markupCanvasRef.current;
        const containerDiv = container;
        if (!canvas || !containerDiv) return;

        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const currentCenter = getTouchCenter(e.touches[0], e.touches[1]);

        // Calculate zoom
        const scaleFactor = currentDistance / lastTouchDistance;
        const newZoom = Math.max(0.25, Math.min(5, zoom * scaleFactor));

        if (newZoom !== zoom) {
          const containerRect = containerDiv.getBoundingClientRect();
          const canvasRect = canvas.getBoundingClientRect();

          const touchXInContainer = lastTouchCenter.x - containerRect.left;
          const touchYInContainer = lastTouchCenter.y - containerRect.top;

          const touchXInCanvas = lastTouchCenter.x - canvasRect.left;
          const touchYInCanvas = lastTouchCenter.y - canvasRect.top;

          const zoomRatio = newZoom / zoom;

          const newTouchXInCanvas = touchXInCanvas * zoomRatio;
          const newTouchYInCanvas = touchYInCanvas * zoomRatio;

          const deltaX = touchXInCanvas - newTouchXInCanvas;
          const deltaY = touchYInCanvas - newTouchYInCanvas;

          // Calculate pan from movement
          const moveDeltaX = currentCenter.x - lastTouchCenter.x;
          const moveDeltaY = currentCenter.y - lastTouchCenter.y;

          setPanOffset(prev => ({
            x: prev.x + deltaX + moveDeltaX,
            y: prev.y + deltaY + moveDeltaY
          }));

          setZoom(newZoom);
        } else {
          // Just pan if zoom hasn't changed
          const moveDeltaX = currentCenter.x - lastTouchCenter.x;
          const moveDeltaY = currentCenter.y - lastTouchCenter.y;

          setPanOffset(prev => ({
            x: prev.x + moveDeltaX,
            y: prev.y + moveDeltaY
          }));
        }

        lastTouchDistance = currentDistance;
        lastTouchCenter = currentCenter;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isTouchZooming = false;
        lastTouchDistance = 0;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoom, panOffset]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('drawings')
        .createSignedUrl(version.file_url, 3600);

      if (error) throw error;
      setFileUrl(data.signedUrl);

      await loadMarkups();

      const loadingTask = pdfjsLib.getDocument({
        url: data.signedUrl,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
        cMapPacked: true,
        withCredentials: false,
      });

      const pdf = await loadingTask.promise;

      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setLoading(false);
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
          text: dbMarkup.data.text,
          textSize: dbMarkup.data.textSize,
          page: dbMarkup.data.page || 1,
          opacity: dbMarkup.data.opacity
        }));
        setMarkups(loadedMarkups);
        setMarkupHistory([loadedMarkups]);
        setHistoryIndex(0);
      }
    } catch (error) {
      console.error('Error loading markups:', error);
    }
  };

  const saveMarkup = async (markup: Markup) => {
    try {
      const { error } = await supabase
        .from('drawing_markups')
        .insert({
          id: markup.id,
          sheet_id: sheet.id,
          version_id: version.id,
          markup_type: markup.tool,
          data: {
            points: markup.points,
            text: markup.text,
            textSize: markup.textSize,
            page: markup.page,
            opacity: markup.opacity
          },
          color: markup.color,
          stroke_width: markup.strokeWidth,
          created_by: user?.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving markup:', error);
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

  const renderPage = async (pageNumber: number, retryCount = 0) => {
    if (!pdfDocument || pageRendering) return;

    try {
      setPageRendering(true);

      const page = await pdfDocument.getPage(pageNumber);
      const container = containerRef.current;

      if (!container) {
        setPageRendering(false);
        return;
      }

      // Get the container dimensions
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Get the page viewport at scale 1 to determine aspect ratio
      const baseViewport = page.getViewport({ scale: 1 });

      console.log('Container dimensions:', { containerWidth, containerHeight });
      console.log('Base viewport:', { width: baseViewport.width, height: baseViewport.height });

      // Ensure we have valid container dimensions
      if (containerWidth <= 0 || containerHeight <= 0) {
        console.warn('Container has invalid dimensions:', containerWidth, containerHeight);
        setPageRendering(false);

        // Retry after a short delay to allow layout to stabilize (max 3 retries)
        if (retryCount < 3) {
          setTimeout(() => renderPage(pageNumber, retryCount + 1), 100);
        }
        return;
      }

      // Calculate scale to fit the page in the container
      const scaleX = containerWidth / baseViewport.width;
      const scaleY = containerHeight / baseViewport.height;
      // Use 90% of container to leave some padding
      const paddingFactor = 0.9;
      const fitScale = Math.min(scaleX, scaleY) * paddingFactor;

      console.log('Scale calculation:', { scaleX, scaleY, fitScale, zoom, containerWidth, containerHeight, baseWidth: baseViewport.width, baseHeight: baseViewport.height });

      // Apply zoom to the fit scale
      const finalScale = fitScale * zoom;
      const viewport = page.getViewport({ scale: finalScale });

      console.log('Rendering viewport:', { width: viewport.width, height: viewport.height, scale: finalScale });

      const pdfCanvas = pdfCanvasRef.current;
      const markupCanvas = markupCanvasRef.current;

      if (!pdfCanvas || !markupCanvas) {
        setPageRendering(false);
        return;
      }

      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;
      markupCanvas.width = viewport.width;
      markupCanvas.height = viewport.height;

      console.log('Canvas dimensions set to:', { width: viewport.width, height: viewport.height });

      const pdfContext = pdfCanvas.getContext('2d');
      if (!pdfContext) {
        setPageRendering(false);
        return;
      }

      pdfContext.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);

      const renderContext = {
        canvasContext: pdfContext,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      redrawMarkups();
      setPageRendering(false);
    } catch (error) {
      console.error('Error rendering page:', error);
      setPageRendering(false);
    }
  };

  const redrawMarkups = () => {
    const canvas = markupCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showMarkups) {
      markups
        .filter(markup => markup.page === currentPage)
        .forEach(markup => {
          drawMarkup(ctx, markup, markup.id === selectedMarkupId);
        });
    }

    // Draw photo pins
    photoPins.forEach(pin => {
      const pinX = pin.x_coordinate * canvas.width;
      const pinY = pin.y_coordinate * canvas.height;
      const isSelected = pin.id === selectedPinId;
      const isHovered = pin.id === hoveredPinId;

      // Draw pin marker
      ctx.save();

      // Highlight if selected or hovered
      if (isSelected || isHovered) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.beginPath();
        ctx.arc(pinX, pinY, 50, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = isSelected ? '#2563EB' : isHovered ? '#3B82F6' : '#3B82F6';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = isSelected ? 3 : 2;

      // Draw camera icon background
      ctx.beginPath();
      ctx.arc(pinX, pinY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw camera icon (simplified)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📷', pinX, pinY);

      // Draw label if exists
      if (pin.label) {
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.font = '12px Arial';
        ctx.strokeText(pin.label, pinX, pinY + 30);
        ctx.fillText(pin.label, pinX, pinY + 30);
      }

      ctx.restore();
    });

    if (calibrationLine) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(calibrationLine.start.x, calibrationLine.start.y);
      ctx.lineTo(calibrationLine.end.x, calibrationLine.end.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (zoomAreaStart && zoomAreaEnd) {
      ctx.strokeStyle = '#00BFFF';
      ctx.fillStyle = 'rgba(0, 191, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      const width = zoomAreaEnd.x - zoomAreaStart.x;
      const height = zoomAreaEnd.y - zoomAreaStart.y;
      ctx.fillRect(zoomAreaStart.x, zoomAreaStart.y, width, height);
      ctx.strokeRect(zoomAreaStart.x, zoomAreaStart.y, width, height);
      ctx.setLineDash([]);
    }
  };

  const drawMarkup = (ctx: CanvasRenderingContext2D, markup: Markup, isSelected: boolean) => {
    ctx.globalAlpha = markup.opacity || 1;
    ctx.strokeStyle = markup.color;
    ctx.fillStyle = markup.color;
    ctx.lineWidth = markup.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = markup.points;
    if (points.length === 0) return;

    switch (markup.tool) {
      case 'pen':
      case 'highlighter':
        if (markup.tool === 'highlighter') {
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = markup.strokeWidth * 3;
        }
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();
        break;

      case 'line':
        if (points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          ctx.lineTo(points[1].x, points[1].y);
          ctx.stroke();
        }
        break;

      case 'multiline':
        if (points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.stroke();
        }
        break;

      case 'dimension':
        if (points.length >= 2) {
          const p1 = points[0];
          const p2 = points[1];

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          const arrowSize = 10;
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(
            p1.x + arrowSize * Math.cos(angle + Math.PI * 0.8),
            p1.y + arrowSize * Math.sin(angle + Math.PI * 0.8)
          );
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(
            p1.x + arrowSize * Math.cos(angle - Math.PI * 0.8),
            p1.y + arrowSize * Math.sin(angle - Math.PI * 0.8)
          );
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(
            p2.x - arrowSize * Math.cos(angle + Math.PI * 0.8),
            p2.y - arrowSize * Math.sin(angle + Math.PI * 0.8)
          );
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(
            p2.x - arrowSize * Math.cos(angle - Math.PI * 0.8),
            p2.y - arrowSize * Math.sin(angle - Math.PI * 0.8)
          );
          ctx.stroke();

          if (scale) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const pixelLength = Math.sqrt(dx * dx + dy * dy);
            const realLength = (pixelLength * scale).toFixed(2);

            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            ctx.save();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;

            const text = `${realLength} ${scaleUnit}`;
            ctx.font = 'bold 14px Arial';
            const metrics = ctx.measureText(text);
            const padding = 4;
            const bgWidth = metrics.width + padding * 2;
            const bgHeight = 20;

            ctx.fillRect(midX - bgWidth/2, midY - bgHeight/2, bgWidth, bgHeight);
            ctx.strokeRect(midX - bgWidth/2, midY - bgHeight/2, bgWidth, bgHeight);

            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, midX, midY);
            ctx.restore();
          } else {
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            ctx.save();
            ctx.fillStyle = '#FF0000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Set Scale', midX, midY);
            ctx.restore();
          }
        }
        break;

      case 'arrow':
        if (points.length >= 2) {
          const start = points[0];
          const end = points[1];
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const arrowLength = 15;

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

      case 'polygon':
        if (points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.closePath();
          ctx.stroke();
        }
        break;

      case 'cloud':
        if (points.length >= 2) {
          const x1 = Math.min(points[0].x, points[1].x);
          const y1 = Math.min(points[0].y, points[1].y);
          const x2 = Math.max(points[0].x, points[1].x);
          const y2 = Math.max(points[0].y, points[1].y);
          const width = x2 - x1;
          const height = y2 - y1;

          const cx = x1 + width / 2;
          const cy = y1 + height / 2;
          const rx = width / 2;
          const ry = height / 2;

          const bumps = 12;
          const bumpSize = 0.15;

          ctx.beginPath();
          for (let i = 0; i <= bumps; i++) {
            const angle = (i / bumps) * Math.PI * 2 - Math.PI / 2;
            const bumpAngle = angle + Math.PI / bumps;

            const x = cx + rx * Math.cos(angle);
            const y = cy + ry * Math.sin(angle);

            if (i === 0) {
              ctx.moveTo(x, y);
            }

            const bumpRadius = Math.min(rx, ry) * bumpSize;
            const bumpX = cx + (rx + bumpRadius) * Math.cos(bumpAngle);
            const bumpY = cy + (ry + bumpRadius) * Math.sin(bumpAngle);

            const nextAngle = ((i + 1) / bumps) * Math.PI * 2 - Math.PI / 2;
            const nextX = cx + rx * Math.cos(nextAngle);
            const nextY = cy + ry * Math.sin(nextAngle);

            ctx.quadraticCurveTo(bumpX, bumpY, nextX, nextY);
          }
          ctx.stroke();
        }
        break;

      case 'symbol':
        if (markup.symbolPath && points.length > 0) {
          const symbolSize = 24;
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
      case 'issue':
        if (markup.text) {
          ctx.font = `${markup.textSize || 16}px Arial`;
          const lines = markup.text.split('\n');
          const lineHeight = (markup.textSize || 16) * 1.2;
          lines.forEach((line, index) => {
            ctx.fillText(line, points[0].x, points[0].y + (index * lineHeight));
          });
        }
        break;
    }

    if (isSelected) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      const bounds = getMarkupBounds(markup);
      if (bounds) {
        ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
      }
      ctx.setLineDash([]);
    }

    ctx.globalAlpha = 1;
  };

  const getMarkupBounds = (markup: Markup) => {
    if (markup.points.length === 0) return null;

    const xs = markup.points.map(p => p.x);
    const ys = markup.points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  };

  const isPointInMarkup = (x: number, y: number, markup: Markup): boolean => {
    const bounds = getMarkupBounds(markup);
    if (!bounds) return false;

    return x >= bounds.x - 10 &&
           x <= bounds.x + bounds.width + 10 &&
           y >= bounds.y - 10 &&
           y <= bounds.y + bounds.height + 10;
  };

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = markupCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);

    // Handle symbol placement
    if (currentTool === 'symbol' && selectedSymbol) {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: 'symbol',
        color: currentColor,
        strokeWidth: strokeWidth,
        points: [point],
        page: currentPage,
        symbolId: selectedSymbol.id,
        symbolPath: selectedSymbol.svg_path,
        symbolViewBox: selectedSymbol.view_box,
      };
      addToHistory([...markups, newMarkup]);
      setSelectedSymbol(null);
      setCurrentTool('select');
      return;
    }

    // Handle photo pin tool
    if (currentTool === 'photo') {
      const canvas = markupCanvasRef.current;
      if (!canvas) return;
      const normalizedX = point.x / canvas.width;
      const normalizedY = point.y / canvas.height;

      // If we're moving a pin, update its position
      if (movingPinId) {
        handleMovePin(normalizedX, normalizedY);
        return;
      }

      setPhotoClickPosition({ x: normalizedX, y: normalizedY });
      setShowPhotoAttachModal(true);
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

    if (currentTool === 'select') {
      // Check if clicking on existing photo pin or its action icons
      const canvas = markupCanvasRef.current;
      if (canvas) {
        const clickedPin = photoPins.find(pin => {
          const pinX = pin.x_coordinate * canvas.width;
          const pinY = pin.y_coordinate * canvas.height;
          const distance = Math.sqrt(Math.pow(point.x - pinX, 2) + Math.pow(point.y - pinY, 2));
          return distance < 30; // Click tolerance
        });

        if (clickedPin) {
          // If clicking on already selected pin, start dragging
          if (clickedPin.id === selectedPinId) {
            setIsDraggingPin(true);
            setDraggedPinId(clickedPin.id);
            return;
          }

          // If pin is not selected, just select it (shows action icons)
          setSelectedPinId(clickedPin.id);
          redrawMarkups();
          return;
        }

        // Clicking elsewhere deselects the pin
        if (selectedPinId) {
          setSelectedPinId(null);
          redrawMarkups();
        }
      }

      const clickedMarkup = markups
        .filter(m => m.page === currentPage)
        .reverse()
        .find(m => isPointInMarkup(point.x, point.y, m));

      if (clickedMarkup) {
        setSelectedMarkupId(clickedMarkup.id);
        setIsDraggingMarkup(true);
        setDragOffset({
          x: point.x - (clickedMarkup.points[0]?.x || 0),
          y: point.y - (clickedMarkup.points[0]?.y || 0)
        });
      } else {
        setSelectedMarkupId(null);
      }
      return;
    }

    if (currentTool === 'pan') {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (currentTool === 'zoom-area') {
      setZoomAreaStart(point);
      setZoomAreaEnd(point);
      return;
    }

    if (currentTool === 'polygon') {
      if (polygonPoints.length === 0) {
        setPolygonPoints([point]);
      } else {
        const firstPoint = polygonPoints[0];
        const distToFirst = Math.sqrt(
          Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
        );
        if (distToFirst < 10 && polygonPoints.length >= 3) {
          const newMarkup: Markup = {
            id: crypto.randomUUID(),
            tool: 'polygon',
            color: currentColor,
            strokeWidth: strokeWidth,
            points: [...polygonPoints, firstPoint],
            page: currentPage
          };
          addToHistory([...markups, newMarkup]);
          setPolygonPoints([]);
        } else {
          setPolygonPoints(prev => [...prev, point]);
        }
      }
      return;
    }

    if (currentTool === 'multiline') {
      if (multiLinePoints.length === 0) {
        setMultiLinePoints([point]);
      } else {
        setMultiLinePoints(prev => [...prev, point]);
      }
      return;
    }

    setIsDrawing(true);
    setStartPoint(point);
    setSelectedMarkupId(null);

    if (currentTool === 'pen' || currentTool === 'highlighter') {
      setCurrentPath([point]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);

    // Handle pin dragging
    if (isDraggingPin && draggedPinId) {
      const canvas = markupCanvasRef.current;
      if (canvas) {
        const normalizedX = point.x / canvas.width;
        const normalizedY = point.y / canvas.height;

        // Update pin position temporarily (visual feedback)
        setPhotoPins(prev => prev.map(pin =>
          pin.id === draggedPinId
            ? { ...pin, x_coordinate: normalizedX, y_coordinate: normalizedY }
            : pin
        ));
        redrawMarkups();
      }
      return;
    }

    // Detect hover over pins
    if (!isDraggingPin && !isDraggingMarkup) {
      const canvas = markupCanvasRef.current;
      if (canvas) {
        const hoveredPin = photoPins.find(pin => {
          const pinX = pin.x_coordinate * canvas.width;
          const pinY = pin.y_coordinate * canvas.height;
          const distance = Math.sqrt(Math.pow(point.x - pinX, 2) + Math.pow(point.y - pinY, 2));
          return distance < 30;
        });
        setHoveredPinId(hoveredPin ? hoveredPin.id : null);
        if (hoveredPinId !== (hoveredPin ? hoveredPin.id : null)) {
          redrawMarkups();
        }
      }
    }

    if (isCalibrating && calibrationLine && !showScaleDialog) {
      setCalibrationLine({ ...calibrationLine, end: point });
      redrawMarkups();
      return;
    }

    if (isDraggingMarkup && selectedMarkupId && dragOffset && currentTool === 'select') {
      const markup = markups.find(m => m.id === selectedMarkupId);
      if (markup) {
        const deltaX = point.x - dragOffset.x - (markup.points[0]?.x || 0);
        const deltaY = point.y - dragOffset.y - (markup.points[0]?.y || 0);

        const updatedMarkup = {
          ...markup,
          points: markup.points.map(p => ({ x: p.x + deltaX, y: p.y + deltaY }))
        };

        setMarkups(prev => prev.map(m => m.id === selectedMarkupId ? updatedMarkup : m));
        setMarkupMoved(true);
      }
      return;
    }

    if (isPanning && lastPanPoint && currentTool === 'pan') {
      const rect = markupCanvasRef.current?.getBoundingClientRect();
      if (rect) {
        const currentX = e.clientX;
        const currentY = e.clientY;
        const dx = currentX - lastPanPoint.x;
        const dy = currentY - lastPanPoint.y;

        setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setLastPanPoint({ x: currentX, y: currentY });
      }
      return;
    }

    if (currentTool === 'zoom-area' && zoomAreaStart) {
      setZoomAreaEnd(point);
      redrawMarkups();
      return;
    }

    if (currentTool === 'polygon' && polygonPoints.length > 0) {
      redrawMarkups();
      const ctx = markupCanvasRef.current?.getContext('2d');
      if (ctx) {
        const tempMarkup: Markup = {
          id: 'temp',
          tool: 'polygon',
          color: currentColor,
          strokeWidth: strokeWidth,
          points: [...polygonPoints, point],
          page: currentPage
        };
        drawMarkup(ctx, tempMarkup, false);

        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(polygonPoints[0].x, polygonPoints[0].y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      return;
    }

    if (currentTool === 'multiline' && multiLinePoints.length > 0) {
      redrawMarkups();
      const ctx = markupCanvasRef.current?.getContext('2d');
      if (ctx) {
        const tempMarkup: Markup = {
          id: 'temp',
          tool: 'multiline',
          color: currentColor,
          strokeWidth: strokeWidth,
          points: [...multiLinePoints, point],
          page: currentPage
        };
        drawMarkup(ctx, tempMarkup, false);
      }
      return;
    }

    if (!isDrawing || !startPoint) return;

    if (currentTool === 'pen' || currentTool === 'highlighter') {
      setCurrentPath(prev => [...prev, point]);
      const tempMarkup: Markup = {
        id: 'temp',
        tool: currentTool,
        color: currentColor,
        strokeWidth: strokeWidth,
        points: [...currentPath, point],
        page: currentPage,
        opacity: currentTool === 'highlighter' ? 0.3 : 1
      };
      redrawMarkups();
      const ctx = markupCanvasRef.current?.getContext('2d');
      if (ctx) drawMarkup(ctx, tempMarkup, false);
    } else {
      const tempMarkup: Markup = {
        id: 'temp',
        tool: currentTool,
        color: currentColor,
        strokeWidth: strokeWidth,
        points: [startPoint, point],
        page: currentPage
      };
      redrawMarkups();
      const ctx = markupCanvasRef.current?.getContext('2d');
      if (ctx) drawMarkup(ctx, tempMarkup, false);
    }
  };

  const handleMouseUp = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle pin drag end
    if (isDraggingPin && draggedPinId) {
      const point = getCanvasPoint(e);
      const canvas = markupCanvasRef.current;
      if (canvas) {
        const normalizedX = point.x / canvas.width;
        const normalizedY = point.y / canvas.height;

        // Save pin position to database
        try {
          const { error } = await supabase
            .from('drawing_photo_pins')
            .update({
              x_coordinate: normalizedX,
              y_coordinate: normalizedY,
            })
            .eq('id', draggedPinId);

          if (error) throw error;
          fetchPhotoPins();
        } catch (error) {
          console.error('Error updating pin position:', error);
          alert('Failed to move pin');
          // Reload original positions
          fetchPhotoPins();
        }
      }

      setIsDraggingPin(false);
      setDraggedPinId(null);
      return;
    }

    if (isDraggingMarkup) {
      if (markupMoved) {
        addToHistory(markups);
        setMarkupMoved(false);
      }
      setIsDraggingMarkup(false);
      setDragOffset(null);
      if (selectedMarkupId) {
        setShowEditDialog(true);
      }
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }

    if (currentTool === 'zoom-area' && zoomAreaStart && zoomAreaEnd) {
      const minX = Math.min(zoomAreaStart.x, zoomAreaEnd.x);
      const maxX = Math.max(zoomAreaStart.x, zoomAreaEnd.x);
      const minY = Math.min(zoomAreaStart.y, zoomAreaEnd.y);
      const maxY = Math.max(zoomAreaStart.y, zoomAreaEnd.y);

      const areaWidth = maxX - minX;
      const areaHeight = maxY - minY;

      if (areaWidth > 10 && areaHeight > 10) {
        const canvas = markupCanvasRef.current;
        if (canvas) {
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;

          const scaleX = canvasWidth / areaWidth;
          const scaleY = canvasHeight / areaHeight;
          const newZoom = Math.min(scaleX, scaleY) * zoom * 0.9;

          const areaCenterX = (minX + maxX) / 2;
          const areaCenterY = (minY + maxY) / 2;
          const canvasCenterX = canvasWidth / 2;
          const canvasCenterY = canvasHeight / 2;

          setPanOffset({
            x: canvasCenterX - areaCenterX,
            y: canvasCenterY - areaCenterY
          });

          setZoom(Math.max(0.25, Math.min(5, newZoom)));
        }
      }

      setZoomAreaStart(null);
      setZoomAreaEnd(null);
      return;
    }

    if (currentTool === 'polygon' || currentTool === 'multiline') {
      return;
    }

    if (!isDrawing || !startPoint) return;

    const point = getCanvasPoint(e);

    if (currentTool === 'text' || currentTool === 'issue') {
      setTextPoint(point);
      setTextToolType(currentTool);
      setTextInput('');
      setShowTextDialog(true);
    } else if (currentTool === 'pen' || currentTool === 'highlighter') {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: currentTool,
        color: currentColor,
        strokeWidth: strokeWidth,
        points: currentPath,
        page: currentPage,
        opacity: currentTool === 'highlighter' ? 0.3 : 1
      };
      addToHistory([...markups, newMarkup]);
      setCurrentPath([]);
    } else {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: currentTool,
        color: currentColor,
        strokeWidth: strokeWidth,
        points: [startPoint, point],
        page: currentPage
      };
      addToHistory([...markups, newMarkup]);
    }

    setIsDrawing(false);
    setStartPoint(null);
  };

  const handleDblClick = () => {
    if (currentTool === 'multiline' && multiLinePoints.length >= 2) {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: 'multiline',
        color: currentColor,
        strokeWidth: strokeWidth,
        points: multiLinePoints,
        page: currentPage
      };
      addToHistory([...markups, newMarkup]);
      setMultiLinePoints([]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (currentTool === 'polygon' && polygonPoints.length >= 3) {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: 'polygon',
        color: currentColor,
        strokeWidth: strokeWidth,
        points: [...polygonPoints, polygonPoints[0]],
        page: currentPage
      };
      addToHistory([...markups, newMarkup]);
      setPolygonPoints([]);
      return;
    }

    if (currentTool === 'multiline' && multiLinePoints.length >= 2) {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: 'multiline',
        color: currentColor,
        strokeWidth: strokeWidth,
        points: multiLinePoints,
        page: currentPage
      };
      addToHistory([...markups, newMarkup]);
      setMultiLinePoints([]);
      return;
    }
  };

  const addToHistory = async (newMarkups: Markup[]) => {
    const oldMarkups = markups;
    const newHistory = markupHistory.slice(0, historyIndex + 1);
    newHistory.push(newMarkups);
    console.log('addToHistory - newHistory:', newHistory.map(h => h.length), 'newIndex:', newHistory.length - 1);
    setMarkupHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setMarkups(newMarkups);

    const addedMarkups = newMarkups.filter(nm => !oldMarkups.some(om => om.id === nm.id));
    const removedMarkups = oldMarkups.filter(om => !newMarkups.some(nm => nm.id === om.id));

    for (const markup of addedMarkups) {
      await saveMarkup(markup);
    }

    for (const markup of removedMarkups) {
      await deleteMarkup(markup.id);
    }
  };

  const handleUndo = () => {
    console.log('handleUndo - current index:', historyIndex, 'history length:', markupHistory.length);
    console.log('handleUndo - history:', markupHistory.map(h => h.length));
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      console.log('handleUndo - going to index:', newIndex, 'markup count:', markupHistory[newIndex].length);
      setHistoryIndex(newIndex);
      setMarkups(markupHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    console.log('handleRedo - current index:', historyIndex, 'history length:', markupHistory.length);
    console.log('handleRedo - history:', markupHistory.map(h => h.length));
    if (historyIndex < markupHistory.length - 1) {
      const newIndex = historyIndex + 1;
      console.log('handleRedo - going to index:', newIndex, 'markup count:', markupHistory[newIndex].length);
      setHistoryIndex(newIndex);
      setMarkups(markupHistory[newIndex]);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim() && textPoint) {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: textToolType,
        color: currentColor,
        strokeWidth: strokeWidth,
        textSize: textSize,
        points: [textPoint],
        text: textInput,
        page: currentPage
      };
      addToHistory([...markups, newMarkup]);
      setShowTextDialog(false);
      setTextInput('');
      setTextPoint(null);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleResetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      setCurrentPath([]);
      setIsDrawing(false);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      setCurrentPath([]);
      setIsDrawing(false);
    }
  };

  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationLine(null);
    setCurrentTool('select');
    alert('Click two points on the drawing to set the scale. The first click starts the line, the second click ends it.');
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

  const clearMarkups = () => {
    if (confirm('Clear all markups on this page?')) {
      addToHistory(markups.filter(m => m.page !== currentPage));
    }
  };

  const clearAllMarkups = () => {
    if (confirm('Clear ALL markups on all pages?')) {
      setMarkups([]);
    }
  };

  const deleteSelectedMarkup = () => {
    if (selectedMarkupId) {
      addToHistory(markups.filter(m => m.id !== selectedMarkupId));
      setSelectedMarkupId(null);
      setShowEditDialog(false);
    }
  };

  const updateSelectedMarkup = (updates: Partial<Markup>) => {
    if (selectedMarkupId) {
      addToHistory(markups.map(m =>
        m.id === selectedMarkupId ? { ...m, ...updates } : m
      ));
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

  const selectedMarkup = selectedMarkupId ? markups.find(m => m.id === selectedMarkupId) : null;

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Top Toolbar */}
      <div className="bg-gray-800 text-white p-2 lg:p-3 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
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
          <div className="flex items-center space-x-1 bg-gray-700 rounded px-1.5 py-0.5 lg:px-2 lg:py-1">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="p-0.5 lg:p-1 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs px-1 lg:px-2 whitespace-nowrap">
              {currentPage}/{totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="p-0.5 lg:p-1 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="h-4 lg:h-6 w-px bg-gray-600 hidden sm:block"></div>

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

          <div className="h-4 lg:h-6 w-px bg-gray-600 hidden md:block"></div>

          {scale && (
            <span className="text-xs bg-green-600 px-2 py-1 rounded hidden lg:inline">
              Scale: 1px = {scale.toFixed(4)} {scaleUnit}
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
      {showToolbar && (
        <div className="bg-gray-800 border-b border-gray-700 p-2 flex items-center space-x-2 overflow-x-auto flex-shrink-0 relative z-50">
        {/* Basic Tools */}
        <button
          onClick={() => { setCurrentTool('select'); setIsCalibrating(false); setCurrentPath([]); setIsDrawing(false); setShowSymbolsPalette(false); }}
          className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors whitespace-nowrap ${currentTool === 'select' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          title="Select"
        >
          <MousePointer2 size={16} />
          <span className="hidden sm:inline">Select</span>
        </button>

        <button
          onClick={() => { setCurrentTool('pan'); setIsCalibrating(false); setCurrentPath([]); setIsDrawing(false); setShowSymbolsPalette(false); }}
          className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors whitespace-nowrap ${currentTool === 'pan' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          title="Pan"
        >
          <Move size={16} />
          <span className="hidden sm:inline">Pan</span>
        </button>

        <button
          onClick={() => { setCurrentTool('zoom-area'); setIsCalibrating(false); setCurrentPath([]); setIsDrawing(false); setShowSymbolsPalette(false); }}
          className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors whitespace-nowrap ${currentTool === 'zoom-area' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          title="Zoom Area"
        >
          <ZoomIn size={16} />
          <span className="hidden sm:inline">Zoom Area</span>
        </button>

        <div className="h-6 w-px bg-gray-600 mx-1"></div>

        {/* Line Tools Dropdown */}
        <div className="relative">
          <button
            ref={lineButtonRef}
            onClick={() => setShowLineDropdown(!showLineDropdown)}
            className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors whitespace-nowrap ${['pen', 'highlighter', 'line', 'multiline', 'arrow'].includes(currentTool) ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            title="Line Tools"
          >
            <Minus size={16} />
            <span className="hidden sm:inline">Lines</span>
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Shape Tools Dropdown */}
        <div className="relative">
          <button
            ref={shapeButtonRef}
            onClick={() => setShowShapeDropdown(!showShapeDropdown)}
            className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors whitespace-nowrap ${['rectangle', 'circle', 'triangle', 'polygon', 'cloud'].includes(currentTool) ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            title="Shape Tools"
          >
            <Square size={16} />
            <span className="hidden sm:inline">Shapes</span>
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Other Tools */}
        <button
          onClick(() => { setCurrentTool('text'); setIsCalibrating(false); setCurrentPath([]); setIsDrawing(false); setShowSymbolsPalette(false); }}
          className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors whitespace-nowrap ${currentTool === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          title="Text"
        >
          <Type size={16} />
          <span className="hidden sm:inline">Text</span>
        </button>

        <button
          onClick={() => { setCurrentTool('dimension'); setIsCalibrating(false); setCurrentPath([]); setIsDrawing(false); setShowSymbolsPalette(false); }}
          className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors whitespace-nowrap ${currentTool === 'dimension' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          title="Dimension"
        >
          <Ruler size={16} />
          <span className="hidden sm:inline">Dimension</span>
        </button>

        <button
          onClick={() => { setCurrentTool('issue'); setIsCalibrating(false); setCurrentPath([]); setIsDrawing(false); setShowSymbolsPalette(false); }}
          className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors whitespace-nowrap ${currentTool === 'issue' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          title="Issue"
        >
          <MessageSquare size={16} />
          <span className="hidden sm:inline">Issue</span>
        </button>

        <button
          onClick={() => { setCurrentTool('photo'); setIsCalibrating(false); setCurrentPath([]); setIsDrawing(false); setShowSymbolsPalette(false); }}
          className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors whitespace-nowrap ${currentTool === 'photo' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          title="Photo Pin"
        >
          <Camera size={16} />
          <span className="hidden sm:inline">Photo Pin</span>
        </button>

        <button
          onClick={() => { setShowSymbolsPalette(true); }}
          className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors whitespace-nowrap ${currentTool === 'symbol' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          title="Symbols"
        >
          <Shapes size={16} />
          <span className="hidden sm:inline">Symbols</span>
        </button>

        <div className="h-6 w-px bg-gray-600 mx-1"></div>

        {/* Undo/Redo */}
        <button
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors whitespace-nowrap ${historyIndex <= 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          title="Undo"
        >
          <Undo size={16} />
          <span className="hidden sm:inline">Undo</span>
        </button>

        <button
          onClick={handleRedo}
          disabled={historyIndex >= markupHistory.length - 1}
          className={`flex items-center space-x-1 px-3 py-2 rounded text-xs transition-colors whitespace-nowrap ${historyIndex >= markupHistory.length - 1 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          title="Redo"
        >
          <Redo size={16} />
          <span className="hidden sm:inline">Redo</span>
        </button>

        <div className="h-6 w-px bg-gray-600 mx-1"></div>

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

        <div className="flex items-center space-x-1 bg-gray-700 rounded px-2 py-1">
          <span className="text-xs text-gray-300 mr-1">Width:</span>
          <select
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="bg-gray-600 text-white text-xs rounded px-2 py-1 border-none"
          >
            {strokeWidths.map(width => (
              <option key={width} value={width}>{width}px</option>
            ))}
          </select>
        </div>

        {(currentTool === 'text' || currentTool === 'issue') && (
          <div className="flex items-center space-x-1 bg-gray-700 rounded px-2 py-1">
            <span className="text-xs text-gray-300 mr-1">Text Size:</span>
            <select
              value={textSize}
              onChange={(e) => setTextSize(Number(e.target.value))}
              className="bg-gray-600 text-white text-xs rounded px-2 py-1 border-none"
            >
              {textSizes.map(size => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>
          </div>
        )}

        {(currentTool === 'polygon' || currentTool === 'multiline') && currentPath.length > 0 && (
          <div className="flex items-center space-x-2 bg-yellow-600 rounded px-3 py-2">
            <span className="text-xs text-white">
              {currentPath.length} points - Double-click to finish
            </span>
          </div>
        )}

        <div className="h-6 w-px bg-gray-600 mx-1"></div>

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
          className="flex items-center space-x-1 px-3 py-2 rounded text-xs bg-orange-600 hover:bg-orange-700"
          title="Clear Page Markups"
        >
          <Trash2 size={16} />
          <span className="hidden sm:inline">Clear Page</span>
        </button>

        <button
          onClick={clearAllMarkups}
          className="flex items-center space-x-1 px-3 py-2 rounded text-xs bg-red-600 hover:bg-red-700"
          title="Clear All Markups"
        >
          <Trash2 size={16} />
          <span className="hidden sm:inline">Clear All</span>
        </button>
        </div>
      )}

      {/* Toolbar Collapse Button */}
      <div className="bg-gray-800 border-b border-gray-700 flex justify-center flex-shrink-0">
        <button
          onClick={() => setShowToolbar(!showToolbar)}
          className="p-1 hover:bg-gray-700 text-white transition-colors"
          title={showToolbar ? "Collapse Toolbar" : "Expand Toolbar"}
        >
          {showToolbar ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden bg-gray-900 w-full h-full" style={{ touchAction: 'none' }}>
        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-white">Loading PDF...</p>
          </div>
        ) : (
          <div
            className="relative bg-white shadow-2xl"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <canvas
              ref={pdfCanvasRef}
              className="block"
              style={{
                display: 'block'
              }}
            />
            <canvas
              ref={markupCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDoubleClick={handleDblClick}
              onContextMenu={handleContextMenu}
              style={{
                cursor:
                  isDraggingPin ? 'grabbing' :
                  currentTool === 'pan' || isPanning ? 'grab' :
                  currentTool === 'select' && (hoveredPinId === selectedPinId) ? 'grab' :
                  currentTool === 'select' ? 'pointer' :
                  currentTool === 'zoom-area' ? 'zoom-in' :
                  'crosshair',
                position: 'absolute',
                top: 0,
                left: 0
              }}
              className="block"
            />

            {/* Photo Pin Action Icons Overlay */}
            {photoPins.map(pin => {
              const canvas = markupCanvasRef.current;
              if (!canvas) return null;

              const rect = canvas.getBoundingClientRect();
              const pinX = pin.x_coordinate * canvas.width;
              const pinY = pin.y_coordinate * canvas.height;
              const isSelected = pin.id === selectedPinId;

              return (
                <div key={pin.id}>
                  {isSelected && (
                    <>
                      {/* Add Photo Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinActionClick(pin, 'add');
                        }}
                        className="absolute bg-white hover:bg-blue-50 text-blue-600 rounded-full p-2 shadow-lg border-2 border-blue-500 transition-all hover:scale-110"
                        style={{
                          left: `${pinX - 70}px`,
                          top: `${pinY - 16}px`,
                          width: '32px',
                          height: '32px',
                          pointerEvents: 'auto',
                        }}
                        title="Add Photo"
                      >
                        <span className="flex items-center justify-center text-lg leading-none">➕</span>
                      </button>

                      {/* View Photos Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinActionClick(pin, 'view');
                        }}
                        className="absolute bg-white hover:bg-blue-50 text-blue-600 rounded-full p-2 shadow-lg border-2 border-blue-500 transition-all hover:scale-110"
                        style={{
                          left: `${pinX - 16}px`,
                          top: `${pinY - 70}px`,
                          width: '32px',
                          height: '32px',
                          pointerEvents: 'auto',
                        }}
                        title="View Photos"
                      >
                        <span className="flex items-center justify-center text-lg leading-none">👁️</span>
                      </button>

                      {/* Move Icon (visual indicator) */}
                      <div
                        className="absolute bg-white text-blue-600 rounded-full p-2 shadow-lg border-2 border-blue-500 cursor-grab hover:cursor-grab"
                        style={{
                          left: `${pinX + 38}px`,
                          top: `${pinY - 16}px`,
                          width: '32px',
                          height: '32px',
                          pointerEvents: 'none',
                        }}
                        title="Drag to Move"
                      >
                        <span className="flex items-center justify-center text-lg leading-none">✋</span>
                      </div>

                      {/* Edit Label Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinActionClick(pin, 'edit');
                        }}
                        className="absolute bg-white hover:bg-blue-50 text-blue-600 rounded-full p-2 shadow-lg border-2 border-blue-500 transition-all hover:scale-110"
                        style={{
                          left: `${pinX + 38}px`,
                          top: `${pinY + 38}px`,
                          width: '32px',
                          height: '32px',
                          pointerEvents: 'auto',
                        }}
                        title="Edit Label"
                      >
                        <span className="flex items-center justify-center text-lg leading-none">✏️</span>
                      </button>

                      {/* Delete Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinActionClick(pin, 'delete');
                        }}
                        className="absolute bg-white hover:bg-red-50 text-red-600 rounded-full p-2 shadow-lg border-2 border-red-500 transition-all hover:scale-110"
                        style={{
                          left: `${pinX - 70}px`,
                          top: `${pinY + 38}px`,
                          width: '32px',
                          height: '32px',
                          pointerEvents: 'auto',
                        }}
                        title="Delete Pin"
                      >
                        <span className="flex items-center justify-center text-lg leading-none">🗑️</span>
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Markups Sidebar */}
        <div className="relative flex flex-shrink-0 hidden md:flex">
          {/* Sidebar Collapse Button */}
          <div className="bg-gray-800 border-l border-gray-700 flex items-center justify-center flex-shrink-0">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 hover:bg-gray-700 text-white transition-colors h-full"
              title={showSidebar ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {showSidebar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Sidebar Content */}
          {showSidebar && (
            <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
              <div className="p-4 text-white">
                <h3 className="text-lg font-bold mb-2">
                  Markups ({markups.filter(m => m.page === currentPage).length} on page {currentPage})
                </h3>
                <p className="text-xs text-gray-400 mb-4">Total: {markups.length} across all pages</p>

                {markups.filter(m => m.page === currentPage).length === 0 ? (
                  <p className="text-sm text-gray-400">No markups on this page. Use the tools to add annotations.</p>
                ) : (
                  <div className="space-y-2">
                    {markups
                      .filter(m => m.page === currentPage)
                      .map((markup) => (
                        <div
                          key={markup.id}
                          className={`bg-gray-700 rounded p-3 flex items-start justify-between cursor-pointer hover:bg-gray-600 ${
                            selectedMarkupId === markup.id ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => {
                            setSelectedMarkupId(markup.id);
                            setShowEditDialog(true);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium capitalize">{markup.tool}</p>
                            <p className="text-xs text-gray-400">
                              Color: <span style={{ color: markup.color }}>{markup.color}</span>
                            </p>
                            {markup.text && (
                              <p className="text-xs text-gray-300 mt-1 truncate">"{markup.text}"</p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToHistory(markups.filter(m => m.id !== markup.id));
                            }}
                            className="text-red-400 hover:text-red-300 flex-shrink-0 ml-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scale Calibration Dialog */}
      {showScaleDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Set Scale</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the real-world length of the line you drew:
            </p>
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="number"
                value={scaleInput}
                onChange={(e) => setScaleInput(e.target.value)}
                placeholder="e.g., 10"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                autoFocus
              />
              <select
                value={scaleUnit}
                onChange={(e) => setScaleUnit(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              >
                <option value="mm">millimeters</option>
                <option value="cm">centimeters</option>
                <option value="m">meters</option>
                <option value="in">inches</option>
                <option value="ft">feet</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowScaleDialog(false);
                  setIsCalibrating(false);
                  setCalibrationLine(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
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

      {/* Text Input Dialog */}
      {showTextDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-gray-900">
              {textToolType === 'text' ? 'Enter Text' : 'Enter Issue Description'}
            </h3>

            <div className="mb-4">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
                placeholder={textToolType === 'text' ? 'Type your text here...\nPress Enter to submit\nShift+Enter for new line' : 'Describe the issue...\nPress Enter to submit\nShift+Enter for new line'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 min-h-[100px] resize-y"
                autoFocus
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowTextDialog(false);
                  setTextInput('');
                  setTextPoint(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleTextSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Markup Dialog */}
      {showEditDialog && selectedMarkup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Edit Markup</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => updateSelectedMarkup({ color })}
                      className={`w-8 h-8 rounded border-2 transition-all ${
                        selectedMarkup.color === color ? 'border-black scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
                <select
                  value={selectedMarkup.strokeWidth}
                  onChange={(e) => updateSelectedMarkup({ strokeWidth: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  {strokeWidths.map(width => (
                    <option key={width} value={width}>{width}px</option>
                  ))}
                </select>
              </div>

              {(selectedMarkup.tool === 'text' || selectedMarkup.tool === 'issue') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Text Size</label>
                    <select
                      value={selectedMarkup.textSize || 16}
                      onChange={(e) => updateSelectedMarkup({ textSize: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    >
                      {textSizes.map(size => (
                        <option key={size} value={size}>{size}px</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Text</label>
                    <input
                      type="text"
                      value={selectedMarkup.text || ''}
                      onChange={(e) => updateSelectedMarkup({ text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex space-x-2 mt-6">
              <button
                onClick={deleteSelectedMarkup}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setShowEditDialog(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Line Dropdown - Fixed Position */}
      {showLineDropdown && lineButtonRef.current && (
        <div
          className="fixed bg-gray-700 rounded shadow-lg z-[1000] min-w-[140px]"
          style={{
            top: `${lineButtonRef.current.getBoundingClientRect().bottom + 4}px`,
            left: `${lineButtonRef.current.getBoundingClientRect().left}px`
          }}
        >
          <button onClick={() => { setCurrentTool('pen'); setShowLineDropdown(false); setCurrentPath([]); setShowSymbolsPalette(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-600 rounded-t">
            <Pen size={14} /> <span>Pen (Freehand)</span>
          </button>
          <button onClick={() => { setCurrentTool('highlighter'); setShowLineDropdown(false); setCurrentPath([]); setShowSymbolsPalette(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-600">
            <Highlighter size={14} /> <span>Highlighter</span>
          </button>
          <button onClick={() => { setCurrentTool('line'); setShowLineDropdown(false); setCurrentPath([]); setShowSymbolsPalette(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-600">
            <Minus size={14} /> <span>Line</span>
          </button>
          <button onClick={() => { setCurrentTool('multiline'); setShowLineDropdown(false); setCurrentPath([]); setShowSymbolsPalette(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-600">
            <Edit3 size={14} /> <span>Multi-Line</span>
          </button>
          <button onClick={() => { setCurrentTool('arrow'); setShowLineDropdown(false); setCurrentPath([]); setShowSymbolsPalette(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-600 rounded-b">
            <ArrowRight size={14} /> <span>Arrow</span>
          </button>
        </div>
      )}

      {/* Shape Dropdown - Fixed Position */}
      {showShapeDropdown && shapeButtonRef.current && (
        <div
          className="fixed bg-gray-700 rounded shadow-lg z-[1000] min-w-[120px]"
          style={{
            top: `${shapeButtonRef.current.getBoundingClientRect().bottom + 4}px`,
            left: `${shapeButtonRef.current.getBoundingClientRect().left}px`
          }}
        >
          <button onClick={() => { setCurrentTool('rectangle'); setShowShapeDropdown(false); setCurrentPath([]); setShowSymbolsPalette(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-600 rounded-t">
            <Square size={14} /> <span>Rectangle</span>
          </button>
          <button onClick={() => { setCurrentTool('circle'); setShowShapeDropdown(false); setCurrentPath([]); setShowSymbolsPalette(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-600">
            <Circle size={14} /> <span>Circle</span>
          </button>
          <button onClick={() => { setCurrentTool('triangle'); setShowShapeDropdown(false); setCurrentPath([]); setShowSymbolsPalette(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-600">
            <Triangle size={14} /> <span>Triangle</span>
          </button>
          <button onClick={() => { setCurrentTool('polygon'); setShowShapeDropdown(false); setPolygonPoints([]); setShowSymbolsPalette(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-600">
            <Hexagon size={14} /> <span>Polygon</span>
          </button>
          <button onClick={() => { setCurrentTool('cloud'); setShowShapeDropdown(false); setCurrentPath([]); setShowSymbolsPalette(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-600 rounded-b">
            <Cloud size={14} /> <span>Cloud</span>
          </button>
        </div>
      )}

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
      {showPhotoPinViewer && photoClickPosition && (
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
      )}

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
