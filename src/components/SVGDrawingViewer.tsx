import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { X, ZoomIn, ZoomOut, Move, ChevronLeft, ChevronRight, Pen, Square, Circle, ArrowRight, Type, MousePointer2, Minus, RotateCcw, Trash2, Undo, Redo, Copy, RotateCw, Ruler, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, Group, Triangle, Hexagon, Cloud, MessageSquare, Camera, Shapes, Highlighter, CreditCard as Edit3, Maximize, Settings, ChevronDown, AlertCircle, ClipboardList, FileText, Clock, AlertTriangle, Eye } from 'lucide-react';
import { supabase, type DrawingSheet, type DrawingVersion } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DrawingPhotoAttachModal from './DrawingPhotoAttachModal';
import DrawingPhotoPinViewer from './DrawingPhotoPinViewer';
import DrawingSymbolsPalette from './DrawingSymbolsPalette';
import { ResizeHandles, VertexEditHandles, SelectionOutline, SymbolResizeHandles } from './MarkupControls';
import { MarkupActionBar } from './MarkupActionBar';
import DrawingViewerToolbar from './DrawingViewerToolbar';
import DrawingEditModal from './DrawingEditModal';
import MarkupFilterPanel from './MarkupFilterPanel';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface SVGDrawingViewerProps {
  sheet: DrawingSheet;
  version: DrawingVersion;
  onClose: () => void;
  onUpdate: () => void;
}

type Tool = 'select' | 'pan' | 'pen' | 'line' | 'multiline' | 'arrow' | 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'polygon' | 'cloud' | 'text' | 'dimension' | 'issue' | 'highlighter' | 'photo' | 'symbol' | 'measure' | 'measure-line' | 'measure-multiline' | 'measure-area';

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
  fillColor?: string;
  fillOpacity?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: number;
  measurementValue?: number;
  measurementUnit?: string;
}

interface PhotoPin {
  id: string;
  x_coordinate: number;
  y_coordinate: number;
  label: string;
  photo_id: string | null;
}

export default function SVGDrawingViewer({ sheet, version, onClose, onUpdate }: SVGDrawingViewerProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);

  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [currentTool, setCurrentTool] = useState<Tool>('pan');
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [markups, setMarkups] = useState<Markup[]>([]);
  const [selectedMarkupIds, setSelectedMarkupIds] = useState<Set<string>>(new Set());
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<Markup[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [clipboard, setClipboard] = useState<Markup[]>([]);
  const [scale, setScale] = useState<number | null>(null);
  const [scaleUnit, setScaleUnit] = useState('mm');
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [multiLinePoints, setMultiLinePoints] = useState<{ x: number; y: number }[]>([]);
  const [photoPins, setPhotoPins] = useState<PhotoPin[]>([]);
  const [showPhotoAttachModal, setShowPhotoAttachModal] = useState(false);
  const [showPhotoPinViewer, setShowPhotoPinViewer] = useState(false);
  const [photoClickPosition, setPhotoClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [isAddingToExistingPin, setIsAddingToExistingPin] = useState(false);
  const [showSymbolsPalette, setShowSymbolsPalette] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<any | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [vertexEditMode, setVertexEditMode] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [showActionBar, setShowActionBar] = useState(true);
  const [showResizeHandles, setShowResizeHandles] = useState(false);
  const [showVertexHandles, setShowVertexHandles] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [textInputTool, setTextInputTool] = useState<'text' | 'issue'>('text');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [visibleMarkupTypes, setVisibleMarkupTypes] = useState<Set<string>>(new Set());
  const [calibrationLine, setCalibrationLine] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [scaleInput, setScaleInput] = useState('');
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [measureTool, setMeasureTool] = useState<'line' | 'multiline' | 'area' | null>(null);
  const [drawingRotation, setDrawingRotation] = useState(0);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEditDrawingModal, setShowEditDrawingModal] = useState(false);
  const [drawingSets, setDrawingSets] = useState<any[]>([]);

  const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FFA500', '#FF00FF', '#00FFFF', '#800080', '#000000', '#FFFFFF'];
  const strokeWidths = [1, 2, 3, 5, 8];

  const tools = [
    { id: 'select' as Tool, icon: MousePointer2, label: 'Select' },
    { id: 'pan' as Tool, icon: Move, label: 'Pan' },
    { id: 'pen' as Tool, icon: Pen, label: 'Freehand' },
    { id: 'line' as Tool, icon: Minus, label: 'Line' },
    { id: 'multiline' as Tool, icon: Edit3, label: 'Multi-Line' },
    { id: 'arrow' as Tool, icon: ArrowRight, label: 'Arrow' },
    { id: 'rectangle' as Tool, icon: Square, label: 'Rectangle' },
    { id: 'circle' as Tool, icon: Circle, label: 'Circle' },
    { id: 'triangle' as Tool, icon: Triangle, label: 'Triangle' },
    { id: 'polygon' as Tool, icon: Hexagon, label: 'Polygon' },
    { id: 'cloud' as Tool, icon: Cloud, label: 'Cloud' },
    { id: 'highlighter' as Tool, icon: Highlighter, label: 'Highlighter' },
    { id: 'text' as Tool, icon: Type, label: 'Text' },
    { id: 'dimension' as Tool, icon: Ruler, label: 'Dimension' },
    { id: 'issue' as Tool, icon: MessageSquare, label: 'Issue' },
    { id: 'photo' as Tool, icon: Camera, label: 'Photo Pin' },
    { id: 'symbol' as Tool, icon: Shapes, label: 'Symbols' },
  ];

  useEffect(() => {
    loadPDF();
    loadMarkups();
    fetchPhotoPins();
    loadScale();
    fetchDrawingSets();
  }, [version.id, currentPage]);

  useEffect(() => {
    if (!pdfDocument || !currentPage) return;

    let cancelled = false;

    const render = async () => {
      if (!canvasRef.current || !containerRef.current || cancelled) return;

      try {
        const page = await pdfDocument.getPage(currentPage);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx || cancelled) return;

        const baseScale = 1.5;
        const highQualityScale = 2;
        const renderScale = baseScale * highQualityScale;

        const baseViewport = page.getViewport({ scale: baseScale });
        const renderViewport = page.getViewport({ scale: renderScale });

        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        canvas.style.width = `${baseViewport.width}px`;
        canvas.style.height = `${baseViewport.height}px`;

        setPageSize({ width: baseViewport.width, height: baseViewport.height });

        if (svgRef.current) {
          svgRef.current.setAttribute('width', baseViewport.width.toString());
          svgRef.current.setAttribute('height', baseViewport.height.toString());
          svgRef.current.setAttribute('viewBox', `0 0 ${baseViewport.width} ${baseViewport.height}`);
        }

        const renderTask = page.render({
          canvasContext: ctx,
          viewport: renderViewport,
        });

        await renderTask.promise;
        if (cancelled) return;

        requestAnimationFrame(() => {
          if (!containerRef.current || cancelled) return;

          const container = containerRef.current;
          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;
          const pageWidth = baseViewport.width;
          const pageHeight = baseViewport.height;

          const scaleX = (containerWidth - 80) / pageWidth;
          const scaleY = (containerHeight - 80) / pageHeight;
          const fitZoom = Math.min(scaleX, scaleY);

          const scaledWidth = pageWidth * fitZoom;
          const scaledHeight = pageHeight * fitZoom;
          const centerX = (containerWidth - scaledWidth) / 2;
          const centerY = (containerHeight - scaledHeight) / 2;

          isInitialLoadRef.current = false;
          setZoom(fitZoom);
          setPan({ x: centerX, y: centerY });
        });
      } catch (error: any) {
        if (!cancelled && error?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', error);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [pdfDocument, currentPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const pointX = (mouseX - pan.x) / zoom;
      const pointY = (mouseY - pan.y) / zoom;

      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      const newZoom = Math.max(0.1, Math.min(5, zoom + delta));

      const newPanX = mouseX - pointX * newZoom;
      const newPanY = mouseY - pointY * newZoom;

      isInitialLoadRef.current = false;
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, pan]);

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
        const rect = container.getBoundingClientRect();
        const center = getTouchCenter(e.touches[0], e.touches[1]);
        lastTouchCenter = {
          x: center.x - rect.left,
          y: center.y - rect.top,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isTouchZooming) {
        e.preventDefault();

        const rect = container.getBoundingClientRect();
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const currentCenter = getTouchCenter(e.touches[0], e.touches[1]);
        const centerX = currentCenter.x - rect.left;
        const centerY = currentCenter.y - rect.top;

        // Calculate zoom
        const scaleFactor = currentDistance / lastTouchDistance;
        const pointX = (lastTouchCenter.x - pan.x) / zoom;
        const pointY = (lastTouchCenter.y - pan.y) / zoom;
        const newZoom = Math.max(0.1, Math.min(5, zoom * scaleFactor));

        // Calculate pan (both from zoom and from movement)
        const zoomPanX = lastTouchCenter.x - pointX * newZoom;
        const zoomPanY = lastTouchCenter.y - pointY * newZoom;

        const moveDeltaX = centerX - lastTouchCenter.x;
        const moveDeltaY = centerY - lastTouchCenter.y;

        isInitialLoadRef.current = false;
        setZoom(newZoom);
        setPan({
          x: zoomPanX + moveDeltaX,
          y: zoomPanY + moveDeltaY
        });

        lastTouchDistance = currentDistance;
        lastTouchCenter = { x: centerX, y: centerY };
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
  }, [zoom, pan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedMarkupIds.size > 0) {
        deleteSelectedMarkups();
      }
      if (e.key === 'Escape') {
        if (vertexEditMode) {
          setVertexEditMode(null);
          setShowVertexHandles(false);
        } else {
          setSelectedMarkupIds(new Set());
          setShowResizeHandles(false);
          setSelectionBox(null);
          setPolygonPoints([]);
          setMultiLinePoints([]);
        }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' && selectedMarkupIds.size > 0) {
          e.preventDefault();
          copySelection();
        }
        if (e.key === 'x' && selectedMarkupIds.size > 0) {
          e.preventDefault();
          copySelection();
          deleteSelectedMarkups();
        }
        if (e.key === 'v' && clipboard.length > 0) {
          e.preventDefault();
          pasteSelection();
        }
        if (e.key === 'g' && selectedMarkupIds.size > 1) {
          e.preventDefault();
          groupSelection();
        }
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        }
        if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMarkupIds, clipboard, markups, historyIndex, polygonPoints, multiLinePoints]);

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

  const loadScale = async () => {
    try {
      const { data, error } = await supabase
        .from('drawing_versions')
        .select('scale, scale_unit')
        .eq('id', version.id)
        .single();

      if (error) throw error;
      if (data?.scale) {
        setScale(data.scale);
        setScaleUnit(data.scale_unit || 'mm');
      }
    } catch (error) {
      console.error('Error loading scale:', error);
    }
  };

  const saveScale = async (newScale: number, unit: string) => {
    try {
      const { error } = await supabase
        .from('drawing_versions')
        .update({ scale: newScale, scale_unit: unit })
        .eq('id', version.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving scale:', error);
    }
  };

  const handlePhotoAttached = () => {
    fetchPhotoPins();
    setShowPhotoAttachModal(false);
    setPhotoClickPosition(null);
    setIsAddingToExistingPin(false);
  };

  const handleSymbolSelect = (symbol: any) => {
    setSelectedSymbol(symbol);
    setShowSymbolsPalette(false);
    setCurrentTool('symbol');
  };

  // Get unique markup types on current page
  const getAvailableMarkupTypes = (): string[] => {
    const typesOnCurrentPage = new Set<string>();
    markups.forEach(m => {
      if (m.page === currentPage) {
        typesOnCurrentPage.add(m.tool);
      }
    });
    // Also add photo pins (pins are per sheet, not per page)
    if (photoPins.length > 0) {
      typesOnCurrentPage.add('photo');
    }
    return Array.from(typesOnCurrentPage).sort();
  };

  // Initialize visible types when markups change
  useEffect(() => {
    const availableTypes = getAvailableMarkupTypes();
    const newVisibleTypes = new Set<string>(availableTypes);
    setVisibleMarkupTypes(newVisibleTypes);
  }, [markups, photoPins, currentPage]);

  const handleToggleMarkupType = (type: string) => {
    const newVisibleTypes = new Set(visibleMarkupTypes);
    if (newVisibleTypes.has(type)) {
      newVisibleTypes.delete(type);
    } else {
      newVisibleTypes.add(type);
    }
    setVisibleMarkupTypes(newVisibleTypes);
  };

  const handleToggleAllMarkupTypes = (visible: boolean) => {
    if (visible) {
      const availableTypes = getAvailableMarkupTypes();
      setVisibleMarkupTypes(new Set(availableTypes));
    } else {
      setVisibleMarkupTypes(new Set());
    }
  };

  // Filter markups based on visibility
  const getVisibleMarkups = () => {
    return markups.filter(m => {
      if (m.page !== currentPage) return false;
      return visibleMarkupTypes.has(m.tool);
    });
  };

  const getVisiblePhotoPins = () => {
    const visiblePins = photoPins.filter(p => {
      // Photo pins are per sheet, not per page, so always show if photo type is visible
      return visibleMarkupTypes.has('photo');
    });

    // Group pins by location (within tolerance) and only show one pin per location
    const tolerance = 0.001;
    const uniqueLocations: PhotoPin[] = [];

    for (const pin of visiblePins) {
      const existingLocation = uniqueLocations.find(
        u => Math.abs(u.x_coordinate - pin.x_coordinate) < tolerance &&
             Math.abs(u.y_coordinate - pin.y_coordinate) < tolerance
      );

      if (!existingLocation) {
        // Prefer pins with photos over empty pins
        const pinsAtLocation = visiblePins.filter(
          p => Math.abs(p.x_coordinate - pin.x_coordinate) < tolerance &&
               Math.abs(p.y_coordinate - pin.y_coordinate) < tolerance
        );
        const pinWithPhoto = pinsAtLocation.find(p => p.photo_id !== null);
        uniqueLocations.push(pinWithPhoto || pin);
      }
    }

    return uniqueLocations;
  };

  const fetchDrawingSets = async () => {
    try {
      const { data, error } = await supabase
        .from('drawing_sets')
        .select('*')
        .eq('project_id', sheet.project_id)
        .order('name');

      if (error) throw error;
      setDrawingSets(data || []);
    } catch (error) {
      console.error('Error fetching drawing sets:', error);
    }
  };

  const calculatePixelDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const calculateRealDistance = (pixelDistance: number) => {
    if (!scale) return null;
    return (pixelDistance * scale).toFixed(2);
  };

  const calculatePolylineLength = (points: { x: number; y: number }[]) => {
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += calculatePixelDistance(points[i], points[i + 1]);
    }
    return totalDistance;
  };

  const calculatePolygonArea = (points: { x: number; y: number }[]) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
  };

  const handleScaleSet = async () => {
    if (!calibrationLine || !scaleInput) return;

    const pixelLength = calculatePixelDistance(calibrationLine.start, calibrationLine.end);
    const realLength = parseFloat(scaleInput);

    if (isNaN(realLength) || realLength <= 0) {
      alert('Please enter a valid measurement');
      return;
    }

    const newScale = realLength / pixelLength;

    const updatedMarkups = markups.map(m => {
      if (m.tool === 'measure-line' && m.points.length >= 2) {
        const pixelDist = calculatePixelDistance(m.points[0], m.points[1]);
        const realDist = pixelDist * newScale;
        const updated = { ...m, measurementValue: realDist, measurementUnit: 'mm' };
        updateMarkup(updated);
        return updated;
      } else if (m.tool === 'measure-multiline' && m.points.length >= 2) {
        const totalPixelLength = calculatePolylineLength(m.points);
        const realLength = totalPixelLength * newScale;
        const updated = { ...m, measurementValue: realLength, measurementUnit: 'mm' };
        updateMarkup(updated);
        return updated;
      } else if (m.tool === 'measure-area' && m.points.length >= 3) {
        const pixelArea = calculatePolygonArea(m.points);
        const realArea = pixelArea * newScale * newScale / 1000000;
        const updated = { ...m, measurementValue: realArea, measurementUnit: 'm²' };
        updateMarkup(updated);
        return updated;
      }
      return m;
    });

    setMarkups(updatedMarkups);
    setScale(newScale);
    await saveScale(newScale, scaleUnit);
    setIsCalibrating(false);
    setCalibrationLine(null);
    setShowScaleDialog(false);
    setScaleInput('');
  };

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase.storage
        .from('drawings')
        .createSignedUrl(version.file_url, 3600);

      if (error) throw error;

      const loadingTask = pdfjsLib.getDocument({
        url: data.signedUrl,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load PDF');
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
          tool: dbMarkup.markup_type as Tool,
          color: dbMarkup.color,
          strokeWidth: Number(dbMarkup.stroke_width),
          points: dbMarkup.data.points || [],
          text: dbMarkup.data.text,
          page: dbMarkup.data.page || 1,
          rotation: dbMarkup.data.rotation || 0,
          groupId: dbMarkup.data.groupId,
          opacity: dbMarkup.data.opacity || 1,
          symbolId: dbMarkup.data.symbolId,
          symbolPath: dbMarkup.data.symbolPath,
          symbolViewBox: dbMarkup.data.symbolViewBox,
        }));
        setMarkups(loadedMarkups);
        addToHistory(loadedMarkups);
      }
    } catch (error) {
      console.error('Error loading markups:', error);
    }
  };

  const saveMarkup = async (markup: Markup) => {
    try {
      await supabase.from('drawing_markups').insert({
        id: markup.id,
        sheet_id: sheet.id,
        version_id: version.id,
        markup_type: markup.tool,
        data: {
          points: markup.points,
          text: markup.text,
          page: markup.page,
          rotation: markup.rotation || 0,
          groupId: markup.groupId,
          opacity: markup.opacity || 1,
          symbolId: markup.symbolId,
          symbolPath: markup.symbolPath,
          symbolViewBox: markup.symbolViewBox,
        },
        color: markup.color,
        stroke_width: markup.strokeWidth,
        created_by: user?.id,
      });
    } catch (error) {
      console.error('Error saving markup:', error);
    }
  };

  const updateMarkup = async (markup: Markup) => {
    try {
      await supabase.from('drawing_markups')
        .update({
          data: {
            points: markup.points,
            text: markup.text,
            page: markup.page,
            rotation: markup.rotation || 0,
            groupId: markup.groupId,
            opacity: markup.opacity || 1,
            symbolId: markup.symbolId,
            symbolPath: markup.symbolPath,
            symbolViewBox: markup.symbolViewBox,
          },
          color: markup.color,
          stroke_width: markup.strokeWidth,
        })
        .eq('id', markup.id);
    } catch (error) {
      console.error('Error updating markup:', error);
    }
  };

  const deleteMarkup = async (markupId: string) => {
    try {
      await supabase.from('drawing_markups').delete().eq('id', markupId);
    } catch (error) {
      console.error('Error deleting markup:', error);
    }
  };

  const deleteSelectedMarkups = async () => {
    for (const id of selectedMarkupIds) {
      await deleteMarkup(id);
    }
    const newMarkups = markups.filter(m => !selectedMarkupIds.has(m.id));
    setMarkups(newMarkups);
    setSelectedMarkupIds(new Set());
    setShowResizeHandles(false);
    addToHistory(newMarkups);
  };

  const copySelection = () => {
    const selectedMarkups = markups.filter(m => selectedMarkupIds.has(m.id));
    setClipboard(selectedMarkups);
  };

  const pasteSelection = () => {
    const newMarkups = clipboard.map(m => ({
      ...m,
      id: crypto.randomUUID(),
      points: m.points.map(p => ({ x: p.x + 20, y: p.y + 20 })),
    }));

    newMarkups.forEach(saveMarkup);
    const allMarkups = [...markups, ...newMarkups];
    setMarkups(allMarkups);
    setSelectedMarkupIds(new Set(newMarkups.map(m => m.id)));
    addToHistory(allMarkups);
  };

  const groupSelection = () => {
    if (selectedMarkupIds.size < 2) return;

    const groupId = crypto.randomUUID();
    const newMarkups = markups.map(m =>
      selectedMarkupIds.has(m.id) ? { ...m, groupId } : m
    );

    newMarkups.forEach(m => {
      if (selectedMarkupIds.has(m.id)) {
        updateMarkup(m);
      }
    });

    setMarkups(newMarkups);
    addToHistory(newMarkups);
  };

  const ungroupSelection = () => {
    const newMarkups = markups.map(m =>
      selectedMarkupIds.has(m.id) ? { ...m, groupId: undefined } : m
    );

    newMarkups.forEach(m => {
      if (selectedMarkupIds.has(m.id)) {
        updateMarkup(m);
      }
    });

    setMarkups(newMarkups);
    addToHistory(newMarkups);
  };

  const rotateSelection = (degrees: number) => {
    const selected = markups.filter(m => selectedMarkupIds.has(m.id));
    if (selected.length === 0) return;

    const bounds = getSelectionBounds(selected);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    const newMarkups = markups.map(m => {
      if (!selectedMarkupIds.has(m.id)) return m;

      const rotatedPoints = m.points.map(p => {
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const rad = (degrees * Math.PI) / 180;
        return {
          x: centerX + dx * Math.cos(rad) - dy * Math.sin(rad),
          y: centerY + dx * Math.sin(rad) + dy * Math.cos(rad),
        };
      });

      const updated = {
        ...m,
        points: rotatedPoints,
        rotation: ((m.rotation || 0) + degrees) % 360,
      };
      updateMarkup(updated);
      return updated;
    });

    setMarkups(newMarkups);
    addToHistory(newMarkups);
  };

  const alignSelection = (alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    const selected = markups.filter(m => selectedMarkupIds.has(m.id));
    if (selected.length < 2) return;

    const bounds = getSelectionBounds(selected);

    const newMarkups = markups.map(m => {
      if (!selectedMarkupIds.has(m.id)) return m;

      const markupBounds = getMarkupBounds(m);
      let offsetX = 0;
      let offsetY = 0;

      switch (alignment) {
        case 'left':
          offsetX = bounds.minX - markupBounds.minX;
          break;
        case 'center-h':
          const markupCenterX = (markupBounds.minX + markupBounds.maxX) / 2;
          const selectionCenterX = (bounds.minX + bounds.maxX) / 2;
          offsetX = selectionCenterX - markupCenterX;
          break;
        case 'right':
          offsetX = bounds.maxX - markupBounds.maxX;
          break;
        case 'top':
          offsetY = bounds.minY - markupBounds.minY;
          break;
        case 'center-v':
          const markupCenterY = (markupBounds.minY + markupBounds.maxY) / 2;
          const selectionCenterY = (bounds.minY + bounds.maxY) / 2;
          offsetY = selectionCenterY - markupCenterY;
          break;
        case 'bottom':
          offsetY = bounds.maxY - markupBounds.maxY;
          break;
      }

      const updated = {
        ...m,
        points: m.points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY })),
      };
      updateMarkup(updated);
      return updated;
    });

    setMarkups(newMarkups);
    addToHistory(newMarkups);
  };

  const getMarkupBounds = (markup: Markup) => {
    if (markup.tool === 'text' || markup.tool === 'issue') {
      const lines = (markup.text || 'Text').split('\n');
      const fontSize = markup.fontSize || 16;
      const lineHeight = fontSize * 1.25;
      const padding = 8;

      const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
      const estimatedWidth = longestLine * fontSize * 0.6;
      const totalHeight = lines.length * lineHeight;

      const baseX = markup.points[0].x;
      const baseY = markup.points[0].y;

      const textAlign = markup.textAlign || 'left';
      let minX, maxX;

      if (textAlign === 'center') {
        minX = baseX - estimatedWidth / 2 - padding;
        maxX = baseX + estimatedWidth / 2 + padding;
      } else if (textAlign === 'right') {
        minX = baseX - estimatedWidth - padding;
        maxX = baseX + padding;
      } else {
        minX = baseX - padding;
        maxX = baseX + estimatedWidth + padding;
      }

      return {
        minX,
        maxX,
        minY: baseY - fontSize - padding,
        maxY: baseY + totalHeight - fontSize + padding,
      };
    }

    if (markup.tool === 'symbol') {
      const symbolSize = markup.symbolSize || 40;
      const centerX = markup.points[0].x;
      const centerY = markup.points[0].y;
      return {
        minX: centerX - symbolSize / 2,
        maxX: centerX + symbolSize / 2,
        minY: centerY - symbolSize / 2,
        maxY: centerY + symbolSize / 2,
      };
    }

    const xs = markup.points.map(p => p.x);
    const ys = markup.points.map(p => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  };

  const getSelectionBounds = (selected: Markup[]) => {
    const allBounds = selected.map(getMarkupBounds);
    return {
      minX: Math.min(...allBounds.map(b => b.minX)),
      maxX: Math.max(...allBounds.map(b => b.maxX)),
      minY: Math.min(...allBounds.map(b => b.minY)),
      maxY: Math.max(...allBounds.map(b => b.maxY)),
    };
  };

  const addToHistory = (newMarkups: Markup[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newMarkups);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setMarkups(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setMarkups(history[historyIndex + 1]);
    }
  };

  const getMousePosition = (e: React.MouseEvent<SVGSVGElement>, applySnap: boolean = false) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };

    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;

    const transformedPoint = pt.matrixTransform(ctm.inverse());

    return { x: transformedPoint.x, y: transformedPoint.y };
  };

  const getTouchPosition = (e: React.TouchEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || e.touches.length === 0) return { x: 0, y: 0 };

    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };

    const touch = e.touches[0];
    const pt = svg.createSVGPoint();
    pt.x = touch.clientX;
    pt.y = touch.clientY;

    const transformedPoint = pt.matrixTransform(ctm.inverse());

    return { x: transformedPoint.x, y: transformedPoint.y };
  };

  const isPointNearPath = (point: { x: number; y: number }, pathPoints: { x: number; y: number }[], threshold: number = 10) => {
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];

      const dist = pointToLineDistance(point, p1, p2);
      if (dist <= threshold) return true;
    }
    return false;
  };

  const isPointInPolygon = (point: { x: number; y: number }, polygonPoints: { x: number; y: number }[]) => {
    let inside = false;
    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
      const xi = polygonPoints[i].x, yi = polygonPoints[i].y;
      const xj = polygonPoints[j].x, yj = polygonPoints[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const pointToLineDistance = (point: { x: number; y: number }, lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }) => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const isPointInMarkup = (point: { x: number; y: number }, markup: Markup, threshold: number = 10) => {
    const bounds = getMarkupBounds(markup);

    switch (markup.tool) {
      case 'rectangle':
        return point.x >= bounds.minX - threshold && point.x <= bounds.maxX + threshold &&
               point.y >= bounds.minY - threshold && point.y <= bounds.maxY + threshold;

      case 'circle':
        if (markup.points.length < 2) return false;
        const radius = Math.hypot(markup.points[1].x - markup.points[0].x, markup.points[1].y - markup.points[0].y);
        const dist = Math.hypot(point.x - markup.points[0].x, point.y - markup.points[0].y);
        return dist <= radius + threshold;

      case 'ellipse':
        return point.x >= bounds.minX - threshold && point.x <= bounds.maxX + threshold &&
               point.y >= bounds.minY - threshold && point.y <= bounds.maxY + threshold;

      case 'line':
      case 'arrow':
      case 'dimension':
      case 'measure-line':
        if (markup.points.length < 2) return false;
        return pointToLineDistance(point, markup.points[0], markup.points[1]) <= threshold;

      case 'polygon':
      case 'cloud':
      case 'measure-area':
        return isPointInPolygon(point, markup.points) || isPointNearPath(point, markup.points, threshold);

      case 'pen':
      case 'multiline':
      case 'measure-multiline':
        return isPointNearPath(point, markup.points, threshold);

      case 'text':
      case 'issue':
      case 'symbol':
        return point.x >= bounds.minX - threshold && point.x <= bounds.maxX + threshold &&
               point.y >= bounds.minY - threshold && point.y <= bounds.maxY + threshold;

      case 'triangle':
        if (markup.points.length >= 3) {
          return isPointInPolygon(point, markup.points) || isPointNearPath(point, markup.points, threshold);
        } else if (markup.points.length >= 2) {
          const p1 = markup.points[0];
          const p2 = markup.points[1];
          const p3x = p1.x - (p2.x - p1.x);
          const trianglePoints = [
            { x: p1.x, y: p2.y },
            { x: p2.x, y: p2.y },
            { x: p3x, y: p1.y }
          ];
          return isPointInPolygon(point, trianglePoints) || isPointNearPath(point, trianglePoints, threshold);
        }
        return false;

      case 'highlighter':
        return isPointNearPath(point, markup.points, threshold * 3);

      default:
        return point.x >= bounds.minX - threshold && point.x <= bounds.maxX + threshold &&
               point.y >= bounds.minY - threshold && point.y <= bounds.maxY + threshold;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const pos = getMousePosition(e);

    if (isCalibrating) {
      if (!calibrationLine) {
        setCalibrationLine({ start: pos, end: pos });
      } else {
        setCalibrationLine({ ...calibrationLine, end: pos });
        setShowScaleDialog(true);
      }
      return;
    }

    if (measureTool) {
      if (measureTool === 'line') {
        if (measurePoints.length === 0) {
          setMeasurePoints([pos]);
        } else {
          const pixelDist = calculatePixelDistance(measurePoints[0], pos);
          const realDist = pixelDist * scale!;

          const newMarkup: Markup = {
            id: crypto.randomUUID(),
            tool: 'measure-line',
            color: '#00FF00',
            strokeWidth: 3,
            points: [measurePoints[0], pos],
            page: currentPage,
            measurementValue: realDist,
            measurementUnit: 'mm',
          };

          const newMarkups = [...markups, newMarkup];
          setMarkups(newMarkups);
          saveMarkup(newMarkup);
          addToHistory(newMarkups);
          setMeasurePoints([]);
        }
      } else {
        setMeasurePoints([...measurePoints, pos]);
      }
      return;
    }

    if (e.button === 1 || currentTool === 'pan') {
      e.preventDefault();
      setIsPanning(true);
      setStartPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (currentTool === 'polygon' || currentTool === 'multiline') {
      return;
    }

    if (currentTool === 'select') {
      const clickedMarkup = markups
        .slice()
        .reverse()
        .find(m => {
          if (m.page !== currentPage) return false;
          return isPointInMarkup(pos, m, 15);
        });

      if (clickedMarkup) {
        if (e.ctrlKey || e.metaKey) {
          const newSelection = new Set(selectedMarkupIds);
          if (newSelection.has(clickedMarkup.id)) {
            newSelection.delete(clickedMarkup.id);
          } else {
            newSelection.add(clickedMarkup.id);
            if (clickedMarkup.groupId) {
              markups.forEach(m => {
                if (m.groupId === clickedMarkup.groupId && !m.locked) {
                  newSelection.add(m.id);
                }
              });
            }
          }
          setSelectedMarkupIds(newSelection);
        } else {
          if (clickedMarkup.groupId) {
            const groupMembers = markups.filter(m => m.groupId === clickedMarkup.groupId && !m.locked);
            setSelectedMarkupIds(new Set(groupMembers.map(m => m.id)));
          } else {
            setSelectedMarkupIds(new Set([clickedMarkup.id]));
          }
        }
        setDragOffset(pos);
        setShowResizeHandles(false);
        setTimeout(() => setShowResizeHandles(true), 300);
        if (vertexEditMode && vertexEditMode !== clickedMarkup.id) {
          setVertexEditMode(null);
          setShowVertexHandles(false);
        }
      } else {
        if (!e.ctrlKey && !e.metaKey) {
          setSelectedMarkupIds(new Set());
          setShowResizeHandles(false);
        }
        if (vertexEditMode) {
          setVertexEditMode(null);
          setShowVertexHandles(false);
        }
        setSelectionBox({ start: pos, end: pos });
      }
      return;
    }

    setIsDrawing(true);
    setStartPoint(pos);
    setCurrentPath([pos]);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const pos = getMousePosition(e);

    // Handle photo pin dragging
    if (draggingPinId && canvasRef.current) {
      const canvas = canvasRef.current;
      // Convert SVG coordinates to normalized (0-1) coordinates
      const x = pos.x / canvas.width;
      const y = pos.y / canvas.height;

      // Clamp to canvas bounds
      const clampedX = Math.max(0, Math.min(1, x));
      const clampedY = Math.max(0, Math.min(1, y));

      // Update pin position in state temporarily
      setPhotoPins(pins => pins.map(p =>
        p.id === draggingPinId
          ? { ...p, x_coordinate: clampedX, y_coordinate: clampedY }
          : p
      ));
      return;
    }

    if (isCalibrating && calibrationLine && !showScaleDialog) {
      setCalibrationLine({ ...calibrationLine, end: pos });
      return;
    }

    if (isPanning && startPoint) {
      const dx = e.clientX - startPoint.x;
      const dy = e.clientY - startPoint.y;
      setPan({
        x: pan.x + dx,
        y: pan.y + dy,
      });
      setStartPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (selectionBox) {
      setSelectionBox({ ...selectionBox, end: pos });
      return;
    }

    if (currentTool === 'select' && selectedMarkupIds.size > 0 && dragOffset) {
      const dx = pos.x - dragOffset.x;
      const dy = pos.y - dragOffset.y;

      const newMarkups = markups.map(m => {
        if (!selectedMarkupIds.has(m.id) || m.locked) return m;
        return {
          ...m,
          points: m.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
        };
      });

      setMarkups(newMarkups);
      setDragOffset(pos);
      return;
    }

    if (isDrawing) {
      if (currentTool === 'pen' || currentTool === 'highlighter') {
        setCurrentPath([...currentPath, pos]);
      } else {
        setCurrentPath([pos]);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    // Handle photo pin drag end
    if (draggingPinId) {
      const pin = photoPins.find(p => p.id === draggingPinId);
      if (pin) {
        updatePhotoPinPosition(draggingPinId, pin.x_coordinate, pin.y_coordinate);
      }
      setDraggingPinId(null);
      return;
    }

    if (isResizing) {
      setIsResizing(false);
      markups.forEach(m => {
        if (selectedMarkupIds.has(m.id)) {
          updateMarkup(m);
        }
      });
      addToHistory(markups);
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      setStartPoint(null);
      return;
    }

    if (selectionBox) {
      const box = selectionBox;
      const minX = Math.min(box.start.x, box.end.x);
      const maxX = Math.max(box.start.x, box.end.x);
      const minY = Math.min(box.start.y, box.end.y);
      const maxY = Math.max(box.start.y, box.end.y);

      const selected = markups.filter(m => {
        if (m.page !== currentPage) return false;
        const bounds = getMarkupBounds(m);
        return bounds.minX >= minX && bounds.maxX <= maxX &&
               bounds.minY >= minY && bounds.maxY <= maxY;
      });

      setSelectedMarkupIds(new Set(selected.map(m => m.id)));
      setSelectionBox(null);
      return;
    }

    if (currentTool === 'select' && dragOffset) {
      setDragOffset(null);
      markups.forEach(m => {
        if (selectedMarkupIds.has(m.id)) {
          updateMarkup(m);
        }
      });
      addToHistory(markups);
      return;
    }

    if (isDrawing && startPoint) {
      const pos = getMousePosition(e);

      if (currentTool === 'photo') {
        createPhotoPin(pos);
      } else if (currentTool === 'symbol' && selectedSymbol) {
        createSymbolMarkup(pos);
      } else if (currentTool === 'text' || currentTool === 'issue') {
        setTextInputPosition(pos);
        setTextInputTool(currentTool);
        setTextInputValue('');
        setShowTextInput(true);
      } else if (currentTool === 'dimension') {
        createDimensionMarkup(startPoint, pos);
      } else {
        const opacity = currentTool === 'highlighter' ? 0.3 : 1;

        let points;
        if (currentTool === 'pen' || currentTool === 'highlighter') {
          points = currentPath;
        } else if (currentTool === 'triangle') {
          const p1 = startPoint;
          const p2 = pos;
          const p3x = p1.x - (p2.x - p1.x);
          points = [
            { x: p1.x, y: p2.y },
            { x: p2.x, y: p2.y },
            { x: p3x, y: p1.y }
          ];
        } else if (currentTool === 'cloud') {
          const width = Math.abs(pos.x - startPoint.x);
          const height = Math.abs(pos.y - startPoint.y);
          const x = Math.min(startPoint.x, pos.x);
          const y = Math.min(startPoint.y, pos.y);
          const bumps = Math.max(8, Math.floor((width + height) / 40));

          const cloudPoints = [];
          for (let i = 0; i <= bumps; i++) {
            const angle = (i / bumps) * Math.PI * 2;
            const bumpX = x + width / 2 + (width / 2) * Math.cos(angle);
            const bumpY = y + height / 2 + (height / 2) * Math.sin(angle);
            cloudPoints.push({ x: bumpX, y: bumpY });
          }
          points = cloudPoints;
        } else {
          points = [startPoint, pos];
        }

        const newMarkup: Markup = {
          id: crypto.randomUUID(),
          tool: currentTool,
          color: currentColor,
          strokeWidth: currentTool === 'highlighter' ? strokeWidth * 3 : strokeWidth,
          points,
          page: currentPage,
          rotation: 0,
          opacity,
        };

        const newMarkups = [...markups, newMarkup];
        setMarkups(newMarkups);
        saveMarkup(newMarkup);
        addToHistory(newMarkups);
      }

      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPath([]);
    }
  };

  const handleSVGClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (currentTool === 'polygon') {
      const pos = getMousePosition(e);
      setPolygonPoints([...polygonPoints, pos]);
    } else if (currentTool === 'multiline') {
      const pos = getMousePosition(e);
      setMultiLinePoints([...multiLinePoints, pos]);
    }
  };

  const handleSVGDoubleClick = () => {
    if (measureTool === 'multiline' && measurePoints.length >= 2) {
      const totalPixelLength = calculatePolylineLength(measurePoints);
      const realLength = totalPixelLength * scale!;

      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: 'measure-multiline',
        color: '#00FF00',
        strokeWidth: 3,
        points: measurePoints,
        page: currentPage,
        measurementValue: realLength,
        measurementUnit: 'mm',
      };

      const newMarkups = [...markups, newMarkup];
      setMarkups(newMarkups);
      saveMarkup(newMarkup);
      addToHistory(newMarkups);
      setMeasurePoints([]);
      return;
    }
    if (measureTool === 'area' && measurePoints.length >= 3) {
      const pixelArea = calculatePolygonArea(measurePoints);
      const realArea = pixelArea * scale! * scale! / 1000000;

      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: 'measure-area',
        color: '#00FF00',
        strokeWidth: 3,
        points: measurePoints,
        page: currentPage,
        fillColor: '#00FF00',
        fillOpacity: 0.2,
        measurementValue: realArea,
        measurementUnit: 'm²',
      };

      const newMarkups = [...markups, newMarkup];
      setMarkups(newMarkups);
      saveMarkup(newMarkup);
      addToHistory(newMarkups);
      setMeasurePoints([]);
      return;
    }
    if (currentTool === 'polygon' && polygonPoints.length >= 3) {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: 'polygon',
        color: currentColor,
        strokeWidth: strokeWidth,
        points: polygonPoints,
        page: currentPage,
        rotation: 0,
      };

      const newMarkups = [...markups, newMarkup];
      setMarkups(newMarkups);
      saveMarkup(newMarkup);
      addToHistory(newMarkups);
      setPolygonPoints([]);
    } else if (currentTool === 'multiline' && multiLinePoints.length >= 2) {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: 'multiline',
        color: currentColor,
        strokeWidth: strokeWidth,
        points: multiLinePoints,
        page: currentPage,
        rotation: 0,
      };

      const newMarkups = [...markups, newMarkup];
      setMarkups(newMarkups);
      saveMarkup(newMarkup);
      addToHistory(newMarkups);
      setMultiLinePoints([]);
    }
  };

  // Touch event handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    // Don't handle multi-touch here - let container handle pan/zoom
    if (e.touches.length !== 1) return;

    const pos = getTouchPosition(e);

    if (isCalibrating) {
      if (!calibrationLine) {
        setCalibrationLine({ start: pos, end: pos });
      } else {
        setCalibrationLine({ ...calibrationLine, end: pos });
        setShowScaleDialog(true);
      }
      return;
    }

    if (measureTool) {
      if (measureTool === 'line') {
        if (measurePoints.length === 0) {
          setMeasurePoints([pos]);
        } else {
          const pixelDist = calculatePixelDistance(measurePoints[0], pos);
          const realDist = pixelDist * scale!;

          const newMarkup: Markup = {
            id: crypto.randomUUID(),
            tool: 'measure-line',
            color: '#00FF00',
            strokeWidth: 3,
            points: [measurePoints[0], pos],
            page: currentPage,
            measurementValue: realDist,
            measurementUnit: 'mm',
          };

          const newMarkups = [...markups, newMarkup];
          setMarkups(newMarkups);
          saveMarkup(newMarkup);
          addToHistory(newMarkups);
          setMeasurePoints([]);
        }
      } else {
        setMeasurePoints([...measurePoints, pos]);
      }
      return;
    }

    if (currentTool === 'pan') {
      const touch = e.touches[0];
      setIsPanning(true);
      setStartPoint({ x: touch.clientX, y: touch.clientY });
      return;
    }

    if (currentTool === 'polygon' || currentTool === 'multiline') {
      return;
    }

    if (currentTool === 'select') {
      const clickedMarkup = markups
        .slice()
        .reverse()
        .find(m => {
          if (m.page !== currentPage) return false;
          return isPointInMarkup(pos, m, 15);
        });

      if (clickedMarkup) {
        if (clickedMarkup.groupId) {
          const groupMembers = markups.filter(m => m.groupId === clickedMarkup.groupId && !m.locked);
          setSelectedMarkupIds(new Set(groupMembers.map(m => m.id)));
        } else {
          setSelectedMarkupIds(new Set([clickedMarkup.id]));
        }
        setDragOffset(pos);
        setShowResizeHandles(false);
        setTimeout(() => setShowResizeHandles(true), 300);
        if (vertexEditMode && vertexEditMode !== clickedMarkup.id) {
          setVertexEditMode(null);
          setShowVertexHandles(false);
        }
      } else {
        setSelectedMarkupIds(new Set());
        setShowResizeHandles(false);
        if (vertexEditMode) {
          setVertexEditMode(null);
          setShowVertexHandles(false);
        }
        setSelectionBox({ start: pos, end: pos });
      }
      return;
    }

    setIsDrawing(true);
    setStartPoint(pos);
    setCurrentPath([pos]);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    // Don't handle multi-touch here
    if (e.touches.length !== 1) return;

    const pos = getTouchPosition(e);

    if (draggingPinId && canvasRef.current) {
      const canvas = canvasRef.current;
      const x = pos.x / canvas.width;
      const y = pos.y / canvas.height;
      const clampedX = Math.max(0, Math.min(1, x));
      const clampedY = Math.max(0, Math.min(1, y));

      setPhotoPins(pins => pins.map(p =>
        p.id === draggingPinId
          ? { ...p, x_coordinate: clampedX, y_coordinate: clampedY }
          : p
      ));
      return;
    }

    if (isCalibrating && calibrationLine && !showScaleDialog) {
      setCalibrationLine({ ...calibrationLine, end: pos });
      return;
    }

    if (isPanning && startPoint) {
      const touch = e.touches[0];
      const dx = touch.clientX - startPoint.x;
      const dy = touch.clientY - startPoint.y;
      setPan({
        x: pan.x + dx,
        y: pan.y + dy,
      });
      setStartPoint({ x: touch.clientX, y: touch.clientY });
      return;
    }

    if (selectionBox) {
      setSelectionBox({ ...selectionBox, end: pos });
      return;
    }

    if (currentTool === 'select' && selectedMarkupIds.size > 0 && dragOffset) {
      const dx = pos.x - dragOffset.x;
      const dy = pos.y - dragOffset.y;

      const newMarkups = markups.map(m => {
        if (!selectedMarkupIds.has(m.id) || m.locked) return m;
        return {
          ...m,
          points: m.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
        };
      });

      setMarkups(newMarkups);
      setDragOffset(pos);
      return;
    }

    if (isDrawing) {
      if (currentTool === 'pen' || currentTool === 'highlighter') {
        setCurrentPath([...currentPath, pos]);
      } else {
        setCurrentPath([pos]);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    if (draggingPinId) {
      const pin = photoPins.find(p => p.id === draggingPinId);
      if (pin) {
        updatePhotoPinPosition(draggingPinId, pin.x_coordinate, pin.y_coordinate);
      }
      setDraggingPinId(null);
      return;
    }

    if (isResizing) {
      setIsResizing(false);
      markups.forEach(m => {
        if (selectedMarkupIds.has(m.id)) {
          updateMarkup(m);
        }
      });
      addToHistory(markups);
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      setStartPoint(null);
      return;
    }

    if (selectionBox) {
      const box = selectionBox;
      const minX = Math.min(box.start.x, box.end.x);
      const maxX = Math.max(box.start.x, box.end.x);
      const minY = Math.min(box.start.y, box.end.y);
      const maxY = Math.max(box.start.y, box.end.y);

      const selected = markups
        .filter(m => m.page === currentPage && !m.locked)
        .filter(m => {
          return m.points.some(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
        });

      setSelectedMarkupIds(new Set(selected.map(m => m.id)));
      setSelectionBox(null);

      if (selected.length > 0) {
        setShowResizeHandles(false);
        setTimeout(() => setShowResizeHandles(true), 300);
      }
      return;
    }

    if (currentTool === 'select' && selectedMarkupIds.size > 0 && dragOffset) {
      markups.forEach(m => {
        if (selectedMarkupIds.has(m.id)) {
          updateMarkup(m);
        }
      });
      addToHistory(markups);
      setDragOffset(null);
      return;
    }

    if (!isDrawing || !startPoint) return;

    const pos = getTouchPosition(e);

    if (currentTool === 'photo') {
      createPhotoPin(pos);
    } else if (currentTool === 'symbol') {
      createSymbolMarkup(pos);
    } else if (currentTool === 'text' || currentTool === 'issue') {
      setTextToolType(currentTool);
      setTextPoint(pos);
      setTextInput('');
      setShowTextDialog(true);
    } else if (currentTool === 'dimension') {
      if (!scale) {
        alert('Please set the drawing scale first using the calibration tool');
        return;
      }
      const length = calculatePixelDistance(startPoint, pos);
      const realLength = length * scale;
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: 'dimension',
        color: currentColor,
        strokeWidth: strokeWidth,
        points: [startPoint, pos],
        text: `${realLength.toFixed(0)} mm`,
        page: currentPage,
        rotation: 0,
      };
      const newMarkups = [...markups, newMarkup];
      setMarkups(newMarkups);
      saveMarkup(newMarkup);
      addToHistory(newMarkups);
    } else {
      const newMarkup: Markup = {
        id: crypto.randomUUID(),
        tool: currentTool,
        color: currentColor,
        strokeWidth: strokeWidth,
        points: currentTool === 'pen' || currentTool === 'highlighter' ? currentPath : [startPoint, pos],
        page: currentPage,
        rotation: 0,
        opacity: currentTool === 'highlighter' ? 0.4 : 1,
      };

      const newMarkups = [...markups, newMarkup];
      setMarkups(newMarkups);
      saveMarkup(newMarkup);
      addToHistory(newMarkups);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPath([]);
  };

  const createPhotoPin = async (pos: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const x = pos.x / canvas.width;
    const y = pos.y / canvas.height;

    setPhotoClickPosition({ x, y });
    setShowPhotoAttachModal(true);
  };

  const createSymbolMarkup = (pos: { x: number; y: number }) => {
    if (!selectedSymbol) return;

    const newMarkup: Markup = {
      id: crypto.randomUUID(),
      tool: 'symbol',
      color: currentColor,
      strokeWidth: strokeWidth,
      points: [pos],
      page: currentPage,
      rotation: 0,
      symbolId: selectedSymbol.id,
      symbolPath: selectedSymbol.svg_path,
      symbolViewBox: selectedSymbol.viewbox || '0 0 24 24',
      symbolSize: 40,
    };

    const newMarkups = [...markups, newMarkup];
    setMarkups(newMarkups);
    saveMarkup(newMarkup);
    addToHistory(newMarkups);
    setSelectedSymbol(null);
  };

  const createTextMarkup = (pos: { x: number; y: number }, text: string, tool: Tool, textAlign: 'left' | 'center' | 'right' = 'left') => {
    const newMarkup: Markup = {
      id: crypto.randomUUID(),
      tool: tool,
      color: currentColor,
      strokeWidth: strokeWidth,
      points: [pos],
      text: text,
      page: currentPage,
      rotation: 0,
      textAlign: textAlign,
      fontSize: 16,
    };

    const newMarkups = [...markups, newMarkup];
    setMarkups(newMarkups);
    saveMarkup(newMarkup);
    addToHistory(newMarkups);
  };

  const handleContextMenu = (e: React.MouseEvent, markupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, markupId });
  };

  const handleEnterVertexEditMode = (markupId: string) => {
    setVertexEditMode(markupId);
    setContextMenu(null);
    setShowVertexHandles(false);
    setTimeout(() => setShowVertexHandles(true), 300);
  };

  const handleMoveVertex = (markupId: string, vertexIndex: number, newX: number, newY: number) => {
    const newMarkups = markups.map(m => {
      if (m.id !== markupId) return m;
      const newPoints = [...m.points];
      newPoints[vertexIndex] = { x: newX, y: newY };
      let updated = { ...m, points: newPoints };

      if (m.tool === 'measure-line' && newPoints.length >= 2) {
        const pixelDist = calculatePixelDistance(newPoints[0], newPoints[1]);
        const realDist = pixelDist * scale!;
        updated = { ...updated, measurementValue: realDist, measurementUnit: 'mm' };
      } else if (m.tool === 'measure-multiline' && newPoints.length >= 2) {
        const totalPixelLength = calculatePolylineLength(newPoints);
        const realLength = totalPixelLength * scale!;
        updated = { ...updated, measurementValue: realLength, measurementUnit: 'mm' };
      } else if (m.tool === 'measure-area' && newPoints.length >= 3) {
        const pixelArea = calculatePolygonArea(newPoints);
        const realArea = pixelArea * scale! * scale! / 1000000;
        updated = { ...updated, measurementValue: realArea, measurementUnit: 'm²' };
      }

      updateMarkup(updated);
      return updated;
    });
    setMarkups(newMarkups);
  };

  const handleAddVertex = (markupId: string, afterIndex: number, x: number, y: number) => {
    const newMarkups = markups.map(m => {
      if (m.id !== markupId) return m;
      const newPoints = [...m.points];
      newPoints.splice(afterIndex, 0, { x, y });
      let updated = { ...m, points: newPoints };

      if (m.tool === 'measure-multiline' && newPoints.length >= 2) {
        const totalPixelLength = calculatePolylineLength(newPoints);
        const realLength = totalPixelLength * scale!;
        updated = { ...updated, measurementValue: realLength, measurementUnit: 'mm' };
      } else if (m.tool === 'measure-area' && newPoints.length >= 3) {
        const pixelArea = calculatePolygonArea(newPoints);
        const realArea = pixelArea * scale! * scale! / 1000000;
        updated = { ...updated, measurementValue: realArea, measurementUnit: 'm²' };
      }

      updateMarkup(updated);
      return updated;
    });
    setMarkups(newMarkups);
    addToHistory(newMarkups);
  };

  const handleDeleteVertex = (markupId: string, vertexIndex: number) => {
    const newMarkups = markups.map(m => {
      if (m.id !== markupId || m.points.length <= 2) return m;
      const newPoints = m.points.filter((_, i) => i !== vertexIndex);
      let updated = { ...m, points: newPoints };

      if (m.tool === 'measure-line' && newPoints.length >= 2) {
        const pixelDist = calculatePixelDistance(newPoints[0], newPoints[1]);
        const realDist = pixelDist * scale!;
        updated = { ...updated, measurementValue: realDist, measurementUnit: 'mm' };
      } else if (m.tool === 'measure-multiline' && newPoints.length >= 2) {
        const totalPixelLength = calculatePolylineLength(newPoints);
        const realLength = totalPixelLength * scale!;
        updated = { ...updated, measurementValue: realLength, measurementUnit: 'mm' };
      } else if (m.tool === 'measure-area' && newPoints.length >= 3) {
        const pixelArea = calculatePolygonArea(newPoints);
        const realArea = pixelArea * scale! * scale! / 1000000;
        updated = { ...updated, measurementValue: realArea, measurementUnit: 'm²' };
      }

      updateMarkup(updated);
      return updated;
    });
    setMarkups(newMarkups);
    addToHistory(newMarkups);
  };

  const handleResizeMarkup = (markupId: string, handleIndex: number, newX: number, newY: number) => {
    const markup = markups.find(m => m.id === markupId);
    if (!markup) return;

    const newMarkups = markups.map(m => {
      if (m.id !== markupId) return m;

      if (markup.tool === 'rectangle') {
        const newPoints = [...m.points];
        newPoints[handleIndex] = { x: newX, y: newY };
        const updated = { ...m, points: newPoints };
        updateMarkup(updated);
        return updated;
      }

      if (markup.tool === 'circle') {
        const newPoints = [...m.points];
        if (newPoints.length >= 2) {
          const centerX = (newPoints[0].x + newPoints[1].x) / 2;
          const centerY = (newPoints[0].y + newPoints[1].y) / 2;

          let newRadius;
          if (handleIndex === 0 || handleIndex === 2) {
            newRadius = Math.abs(newY - centerY);
          } else {
            newRadius = Math.abs(newX - centerX);
          }

          newPoints[0] = { x: centerX - newRadius, y: centerY - newRadius };
          newPoints[1] = { x: centerX + newRadius, y: centerY + newRadius };
        }
        const updated = { ...m, points: newPoints };
        updateMarkup(updated);
        return updated;
      }

      if (markup.tool === 'ellipse') {
        const newPoints = [...m.points];
        if (newPoints.length >= 2) {
          const centerX = (newPoints[0].x + newPoints[1].x) / 2;
          const centerY = (newPoints[0].y + newPoints[1].y) / 2;

          if (handleIndex === 0 || handleIndex === 2) {
            const newRadiusY = Math.abs(newY - centerY);
            newPoints[0].y = centerY - newRadiusY;
            newPoints[1].y = centerY + newRadiusY;
          } else {
            const newRadiusX = Math.abs(newX - centerX);
            newPoints[0].x = centerX - newRadiusX;
            newPoints[1].x = centerX + newRadiusX;
          }
        }
        const updated = { ...m, points: newPoints };
        updateMarkup(updated);
        return updated;
      }

      if (markup.tool === 'text' || markup.tool === 'issue') {
        const bounds = getMarkupBounds(m);
        const currentWidth = bounds.maxX - bounds.minX;
        const currentHeight = bounds.maxY - bounds.minY;

        let newPoints = [...m.points];
        let scaleX = 1;
        let scaleY = 1;

        switch(handleIndex) {
          case 0:
            scaleX = (bounds.maxX - newX) / currentWidth;
            scaleY = (bounds.maxY - newY) / currentHeight;
            newPoints[0] = { x: newX + (bounds.maxX - bounds.minX) * (1 - scaleX), y: newY + (bounds.maxY - bounds.minY) * (1 - scaleY) };
            break;
          case 1:
            scaleX = (newX - bounds.minX) / currentWidth;
            scaleY = (bounds.maxY - newY) / currentHeight;
            newPoints[0] = { x: bounds.minX, y: newY + (bounds.maxY - bounds.minY) * (1 - scaleY) };
            break;
          case 2:
            scaleX = (newX - bounds.minX) / currentWidth;
            scaleY = (newY - bounds.minY) / currentHeight;
            newPoints[0] = { x: bounds.minX, y: bounds.minY };
            break;
          case 3:
            scaleX = (bounds.maxX - newX) / currentWidth;
            scaleY = (newY - bounds.minY) / currentHeight;
            newPoints[0] = { x: newX + (bounds.maxX - bounds.minX) * (1 - scaleX), y: bounds.minY };
            break;
        }

        const updated = { ...m, points: newPoints };
        updateMarkup(updated);
        return updated;
      }

      if (markup.tool === 'line' || markup.tool === 'arrow' || markup.tool === 'triangle' ||
          markup.tool === 'polygon' || markup.tool === 'multiline' || markup.tool === 'pen' ||
          markup.tool === 'cloud') {
        const newPoints = [...m.points];
        if (handleIndex < newPoints.length) {
          newPoints[handleIndex] = { x: newX, y: newY };
        }
        const updated = { ...m, points: newPoints };
        updateMarkup(updated);
        return updated;
      }

      return m;
    });

    setMarkups(newMarkups);
  };

  const handleDuplicateMarkup = (ids: string[]) => {
    const toDuplicate = markups.filter(m => ids.includes(m.id));
    const newMarkups = [...markups];

    toDuplicate.forEach(m => {
      const duplicated: Markup = {
        ...m,
        id: crypto.randomUUID(),
        points: m.points.map(p => ({ x: p.x + 20, y: p.y + 20 })),
      };
      newMarkups.push(duplicated);
      saveMarkup(duplicated);
    });

    setMarkups(newMarkups);
    addToHistory(newMarkups);
    setContextMenu(null);
  };

  const handleToggleLock = (markupId: string) => {
    const newMarkups = markups.map(m => {
      if (m.id !== markupId) return m;
      const updated = { ...m, locked: !m.locked };
      updateMarkup(updated);
      return updated;
    });
    setMarkups(newMarkups);
    setContextMenu(null);
  };

  const handleBringToFront = (markupId: string) => {
    const maxZ = Math.max(...markups.map(m => m.zIndex || 0), 0);
    const newMarkups = markups.map(m => {
      if (m.id !== markupId) return m;
      const updated = { ...m, zIndex: maxZ + 1 };
      updateMarkup(updated);
      return updated;
    });
    setMarkups(newMarkups);
    setContextMenu(null);
  };

  const handleSendToBack = (markupId: string) => {
    const minZ = Math.min(...markups.map(m => m.zIndex || 0), 0);
    const newMarkups = markups.map(m => {
      if (m.id !== markupId) return m;
      const updated = { ...m, zIndex: minZ - 1 };
      updateMarkup(updated);
      return updated;
    });
    setMarkups(newMarkups);
    setContextMenu(null);
  };

  const handleAlignLeft = () => {
    const selectedMarkups = markups.filter(m => selectedMarkupIds.has(m.id) && !m.locked);
    if (selectedMarkups.length < 2) return;

    const bounds = selectedMarkups.map(m => getMarkupBounds(m));
    const minX = Math.min(...bounds.map(b => b.minX));

    const newMarkups = markups.map(m => {
      if (!selectedMarkupIds.has(m.id) || m.locked) return m;
      const currentBounds = getMarkupBounds(m);
      const offsetX = minX - currentBounds.minX;
      const updatedPoints = m.points.map(p => ({ x: p.x + offsetX, y: p.y }));
      const updated = { ...m, points: updatedPoints };
      updateMarkup(updated);
      return updated;
    });
    setMarkups(newMarkups);
  };

  const handleAlignCenter = () => {
    const selectedMarkups = markups.filter(m => selectedMarkupIds.has(m.id) && !m.locked);
    if (selectedMarkups.length < 2) return;

    const bounds = selectedMarkups.map(m => getMarkupBounds(m));
    const minX = Math.min(...bounds.map(b => b.minX));
    const maxX = Math.max(...bounds.map(b => b.maxX));
    const centerX = (minX + maxX) / 2;

    const newMarkups = markups.map(m => {
      if (!selectedMarkupIds.has(m.id) || m.locked) return m;
      const currentBounds = getMarkupBounds(m);
      const currentCenterX = (currentBounds.minX + currentBounds.maxX) / 2;
      const offsetX = centerX - currentCenterX;
      const updatedPoints = m.points.map(p => ({ x: p.x + offsetX, y: p.y }));
      const updated = { ...m, points: updatedPoints };
      updateMarkup(updated);
      return updated;
    });
    setMarkups(newMarkups);
  };

  const handleAlignRight = () => {
    const selectedMarkups = markups.filter(m => selectedMarkupIds.has(m.id) && !m.locked);
    if (selectedMarkups.length < 2) return;

    const bounds = selectedMarkups.map(m => getMarkupBounds(m));
    const maxX = Math.max(...bounds.map(b => b.maxX));

    const newMarkups = markups.map(m => {
      if (!selectedMarkupIds.has(m.id) || m.locked) return m;
      const currentBounds = getMarkupBounds(m);
      const offsetX = maxX - currentBounds.maxX;
      const updatedPoints = m.points.map(p => ({ x: p.x + offsetX, y: p.y }));
      const updated = { ...m, points: updatedPoints };
      updateMarkup(updated);
      return updated;
    });
    setMarkups(newMarkups);
  };

  const handleAlignTop = () => {
    const selectedMarkups = markups.filter(m => selectedMarkupIds.has(m.id) && !m.locked);
    if (selectedMarkups.length < 2) return;

    const bounds = selectedMarkups.map(m => getMarkupBounds(m));
    const minY = Math.min(...bounds.map(b => b.minY));

    const newMarkups = markups.map(m => {
      if (!selectedMarkupIds.has(m.id) || m.locked) return m;
      const currentBounds = getMarkupBounds(m);
      const offsetY = minY - currentBounds.minY;
      const updatedPoints = m.points.map(p => ({ x: p.x, y: p.y + offsetY }));
      const updated = { ...m, points: updatedPoints };
      updateMarkup(updated);
      return updated;
    });
    setMarkups(newMarkups);
  };

  const handleAlignMiddle = () => {
    const selectedMarkups = markups.filter(m => selectedMarkupIds.has(m.id) && !m.locked);
    if (selectedMarkups.length < 2) return;

    const bounds = selectedMarkups.map(m => getMarkupBounds(m));
    const minY = Math.min(...bounds.map(b => b.minY));
    const maxY = Math.max(...bounds.map(b => b.maxY));
    const centerY = (minY + maxY) / 2;

    const newMarkups = markups.map(m => {
      if (!selectedMarkupIds.has(m.id) || m.locked) return m;
      const currentBounds = getMarkupBounds(m);
      const currentCenterY = (currentBounds.minY + currentBounds.maxY) / 2;
      const offsetY = centerY - currentCenterY;
      const updatedPoints = m.points.map(p => ({ x: p.x, y: p.y + offsetY }));
      const updated = { ...m, points: updatedPoints };
      updateMarkup(updated);
      return updated;
    });
    setMarkups(newMarkups);
  };

  const handleAlignBottom = () => {
    const selectedMarkups = markups.filter(m => selectedMarkupIds.has(m.id) && !m.locked);
    if (selectedMarkups.length < 2) return;

    const bounds = selectedMarkups.map(m => getMarkupBounds(m));
    const maxY = Math.max(...bounds.map(b => b.maxY));

    const newMarkups = markups.map(m => {
      if (!selectedMarkupIds.has(m.id) || m.locked) return m;
      const currentBounds = getMarkupBounds(m);
      const offsetY = maxY - currentBounds.maxY;
      const updatedPoints = m.points.map(p => ({ x: p.x, y: p.y + offsetY }));
      const updated = { ...m, points: updatedPoints };
      updateMarkup(updated);
      return updated;
    });
    setMarkups(newMarkups);
  };

  const createDimensionMarkup = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const actualDistance = scale ? (distance * scale).toFixed(2) : distance.toFixed(0);
    const measureText = scale ? `${actualDistance} ${scaleUnit}` : `${actualDistance} px`;

    const newMarkup: Markup = {
      id: crypto.randomUUID(),
      tool: 'dimension',
      color: currentColor,
      strokeWidth: strokeWidth,
      points: [start, end],
      text: measureText,
      page: currentPage,
      rotation: 0,
    };

    const newMarkups = [...markups, newMarkup];
    setMarkups(newMarkups);
    saveMarkup(newMarkup);
    addToHistory(newMarkups);
  };

  const renderMarkup = (markup: Markup) => {
    if (markup.page !== currentPage) return null;

    const isSelected = selectedMarkupIds.has(markup.id);
    const stroke = isSelected ? '#00FF00' : markup.color;
    const strokeW = isSelected ? markup.strokeWidth + 1 : markup.strokeWidth;
    const opacity = markup.opacity || 1;

    const bounds = getMarkupBounds(markup);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    switch (markup.tool) {
      case 'pen':
        const pathData = markup.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return <path key={markup.id} d={pathData} stroke={stroke} strokeWidth={strokeW} fill="none" opacity={opacity} />;

      case 'line':
        return (
          <line
            key={markup.id}
            x1={markup.points[0].x}
            y1={markup.points[0].y}
            x2={markup.points[1].x}
            y2={markup.points[1].y}
            stroke={stroke}
            strokeWidth={strokeW}
            opacity={opacity}
          />
        );

      case 'multiline':
        const multiPathData = markup.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return <path key={markup.id} d={multiPathData} stroke={stroke} strokeWidth={strokeW} fill="none" opacity={opacity} />;

      case 'dimension':
        const midX = (markup.points[0].x + markup.points[1].x) / 2;
        const midY = (markup.points[0].y + markup.points[1].y) / 2;
        const arrowSize = 10;
        const angle = Math.atan2(markup.points[1].y - markup.points[0].y, markup.points[1].x - markup.points[0].x);
        return (
          <g key={markup.id} opacity={opacity}>
            <line
              x1={markup.points[0].x}
              y1={markup.points[0].y}
              x2={markup.points[1].x}
              y2={markup.points[1].y}
              stroke={stroke}
              strokeWidth={strokeW}
            />
            <line
              x1={markup.points[0].x}
              y1={markup.points[0].y}
              x2={markup.points[0].x + arrowSize * Math.cos(angle + Math.PI - 0.3)}
              y2={markup.points[0].y + arrowSize * Math.sin(angle + Math.PI - 0.3)}
              stroke={stroke}
              strokeWidth={strokeW}
            />
            <line
              x1={markup.points[0].x}
              y1={markup.points[0].y}
              x2={markup.points[0].x + arrowSize * Math.cos(angle + Math.PI + 0.3)}
              y2={markup.points[0].y + arrowSize * Math.sin(angle + Math.PI + 0.3)}
              stroke={stroke}
              strokeWidth={strokeW}
            />
            <line
              x1={markup.points[1].x}
              y1={markup.points[1].y}
              x2={markup.points[1].x + arrowSize * Math.cos(angle - 0.3)}
              y2={markup.points[1].y + arrowSize * Math.sin(angle - 0.3)}
              stroke={stroke}
              strokeWidth={strokeW}
            />
            <line
              x1={markup.points[1].x}
              y1={markup.points[1].y}
              x2={markup.points[1].x + arrowSize * Math.cos(angle + 0.3)}
              y2={markup.points[1].y + arrowSize * Math.sin(angle + 0.3)}
              stroke={stroke}
              strokeWidth={strokeW}
            />
            {markup.text && (
              <text
                x={midX}
                y={midY - 10}
                fill={stroke}
                fontSize={14}
                fontWeight="bold"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {markup.text}
              </text>
            )}
          </g>
        );

      case 'arrow':
        const arrowAngle = Math.atan2(markup.points[1].y - markup.points[0].y, markup.points[1].x - markup.points[0].x);
        const arrowLength = 15;
        const arrowHeadAngle = Math.PI / 6;
        return (
          <g key={markup.id} opacity={opacity}>
            <line
              x1={markup.points[0].x}
              y1={markup.points[0].y}
              x2={markup.points[1].x}
              y2={markup.points[1].y}
              stroke={stroke}
              strokeWidth={strokeW}
            />
            <line
              x1={markup.points[1].x}
              y1={markup.points[1].y}
              x2={markup.points[1].x - arrowLength * Math.cos(arrowAngle - arrowHeadAngle)}
              y2={markup.points[1].y - arrowLength * Math.sin(arrowAngle - arrowHeadAngle)}
              stroke={stroke}
              strokeWidth={strokeW}
            />
            <line
              x1={markup.points[1].x}
              y1={markup.points[1].y}
              x2={markup.points[1].x - arrowLength * Math.cos(arrowAngle + arrowHeadAngle)}
              y2={markup.points[1].y - arrowLength * Math.sin(arrowAngle + arrowHeadAngle)}
              stroke={stroke}
              strokeWidth={strokeW}
            />
          </g>
        );

      case 'rectangle':
        const width = markup.points[1].x - markup.points[0].x;
        const height = markup.points[1].y - markup.points[0].y;
        return (
          <rect
            key={markup.id}
            x={markup.points[0].x}
            y={markup.points[0].y}
            width={width}
            height={height}
            stroke={stroke}
            strokeWidth={strokeW}
            fill={markup.fillColor || "none"}
            fillOpacity={markup.fillOpacity ?? 1}
            opacity={opacity}
            transform={markup.rotation ? `rotate(${markup.rotation} ${centerX} ${centerY})` : undefined}
          />
        );

      case 'circle':
        const radius = Math.hypot(markup.points[1].x - markup.points[0].x, markup.points[1].y - markup.points[0].y);
        return (
          <circle
            key={markup.id}
            cx={markup.points[0].x}
            cy={markup.points[0].y}
            r={radius}
            stroke={stroke}
            strokeWidth={strokeW}
            fill={markup.fillColor || "none"}
            fillOpacity={markup.fillOpacity ?? 1}
            opacity={opacity}
          />
        );

      case 'ellipse':
        const rx = Math.abs(markup.points[1].x - markup.points[0].x);
        const ry = Math.abs(markup.points[1].y - markup.points[0].y);
        return (
          <ellipse
            key={markup.id}
            cx={markup.points[0].x}
            cy={markup.points[0].y}
            rx={rx}
            ry={ry}
            stroke={stroke}
            strokeWidth={strokeW}
            fill={markup.fillColor || "none"}
            fillOpacity={markup.fillOpacity ?? 1}
            opacity={opacity}
            transform={markup.rotation ? `rotate(${markup.rotation} ${markup.points[0].x} ${markup.points[0].y})` : undefined}
          />
        );

      case 'triangle':
        if (markup.points.length === 3) {
          const trianglePoints = markup.points.map(p => `${p.x},${p.y}`).join(' ');
          return (
            <polygon
              key={markup.id}
              points={trianglePoints}
              stroke={stroke}
              strokeWidth={strokeW}
              fill={markup.fillColor || "none"}
              fillOpacity={markup.fillOpacity ?? 1}
              opacity={opacity}
              transform={markup.rotation ? `rotate(${markup.rotation} ${centerX} ${centerY})` : undefined}
            />
          );
        } else {
          const p1 = markup.points[0];
          const p2 = markup.points[1];
          const p3x = p1.x - (p2.x - p1.x);
          const trianglePoints = `${p1.x},${p2.y} ${p2.x},${p2.y} ${p3x},${p1.y}`;
          return (
            <polygon
              key={markup.id}
              points={trianglePoints}
              stroke={stroke}
              strokeWidth={strokeW}
              fill={markup.fillColor || "none"}
              fillOpacity={markup.fillOpacity ?? 1}
              opacity={opacity}
              transform={markup.rotation ? `rotate(${markup.rotation} ${centerX} ${centerY})` : undefined}
            />
          );
        }

      case 'polygon':
        const polygonPointsStr = markup.points.map(p => `${p.x},${p.y}`).join(' ');
        return (
          <polygon
            key={markup.id}
            points={polygonPointsStr}
            stroke={stroke}
            strokeWidth={strokeW}
            fill={markup.fillColor || "none"}
            fillOpacity={markup.fillOpacity ?? 1}
            opacity={opacity}
            transform={markup.rotation ? `rotate(${markup.rotation} ${centerX} ${centerY})` : undefined}
          />
        );

      case 'cloud':
        let cloudPath;
        if (markup.points.length > 2) {
          cloudPath = markup.points.map((p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = markup.points[i - 1];
            const cpX1 = prev.x + (p.x - prev.x) * 0.5;
            const cpY1 = prev.y + (p.y - prev.y) * 0.5;
            const cpX2 = prev.x + (p.x - prev.x) * 0.5;
            const cpY2 = prev.y + (p.y - prev.y) * 0.5;
            return `C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
          }).join(' ') + ' Z';
        } else {
          cloudPath = generateCloudPath(markup.points[0], markup.points[1]);
        }
        return (
          <path
            key={markup.id}
            d={cloudPath}
            stroke={stroke}
            strokeWidth={strokeW}
            fill={markup.fillColor || "none"}
            fillOpacity={markup.fillOpacity ?? 1}
            opacity={opacity}
          />
        );

      case 'highlighter':
        const highlighterData = markup.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return (
          <path
            key={markup.id}
            d={highlighterData}
            stroke={stroke}
            strokeWidth={strokeW}
            fill="none"
            opacity={opacity}
            strokeLinecap="round"
          />
        );

      case 'text':
      case 'issue':
        const lines = (markup.text || 'Text').split('\n');
        const markupFontSize = markup.fontSize || 16;
        const lineHeight = markupFontSize * 1.25;
        const textAlign = markup.textAlign || 'left';
        let textAnchor = 'start';
        if (textAlign === 'center') textAnchor = 'middle';
        if (textAlign === 'right') textAnchor = 'end';

        const bounds = getMarkupBounds(markup);
        const isSelected = selectedMarkupIds.has(markup.id);

        return (
          <g key={markup.id} opacity={opacity}>
            <rect
              x={bounds.minX}
              y={bounds.minY}
              width={bounds.maxX - bounds.minX}
              height={bounds.maxY - bounds.minY}
              fill={markup.tool === 'issue' ? stroke : 'transparent'}
              fillOpacity={markup.tool === 'issue' ? 0.1 : 0}
              stroke={isSelected ? '#3B82F6' : 'transparent'}
              strokeWidth={1}
              strokeDasharray={isSelected ? '4,4' : 'none'}
              pointerEvents="all"
            />
            <text
              x={markup.points[0].x}
              y={markup.points[0].y}
              fill={stroke}
              fontSize={markupFontSize}
              fontWeight={markup.tool === 'issue' ? 'bold' : 'normal'}
              textAnchor={textAnchor}
              pointerEvents="none"
              transform={markup.rotation ? `rotate(${markup.rotation} ${markup.points[0].x} ${markup.points[0].y})` : undefined}
            >
              {lines.map((line, i) => (
                <tspan key={i} x={markup.points[0].x} dy={i === 0 ? 0 : lineHeight}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );

      case 'symbol':
        if (!markup.symbolPath) return null;
        const symbolSize = markup.symbolSize || 40;
        const viewBox = markup.symbolViewBox || '0 0 24 24';
        const symbolBounds = getMarkupBounds(markup);
        const isSymbolSelected = selectedMarkupIds.has(markup.id);

        return (
          <g key={markup.id} opacity={opacity}>
            {isSymbolSelected && (
              <rect
                x={symbolBounds.minX}
                y={symbolBounds.minY}
                width={symbolBounds.maxX - symbolBounds.minX}
                height={symbolBounds.maxY - symbolBounds.minY}
                fill="none"
                stroke="#3B82F6"
                strokeWidth={1}
                strokeDasharray="4,4"
                pointerEvents="none"
              />
            )}
            <svg
              x={markup.points[0].x - symbolSize / 2}
              y={markup.points[0].y - symbolSize / 2}
              width={symbolSize}
              height={symbolSize}
              viewBox={viewBox}
              transform={markup.rotation ? `rotate(${markup.rotation} ${markup.points[0].x} ${markup.points[0].y})` : undefined}
              style={{ pointerEvents: 'all' }}
            >
              <path d={markup.symbolPath} fill={stroke} stroke={stroke} strokeWidth={strokeW / 2} />
            </svg>
          </g>
        );

      case 'measure-line':
        const measureLineMidX = (markup.points[0].x + markup.points[1].x) / 2;
        const measureLineMidY = (markup.points[0].y + markup.points[1].y) / 2;
        return (
          <g key={markup.id} opacity={opacity}>
            <line
              x1={markup.points[0].x}
              y1={markup.points[0].y}
              x2={markup.points[1].x}
              y2={markup.points[1].y}
              stroke={stroke}
              strokeWidth={strokeW}
            />
            <circle cx={markup.points[0].x} cy={markup.points[0].y} r={5} fill={stroke} />
            <circle cx={markup.points[1].x} cy={markup.points[1].y} r={5} fill={stroke} />
            <text
              x={measureLineMidX}
              y={measureLineMidY - 10}
              fill={stroke}
              fontSize={16}
              fontWeight="bold"
              textAnchor="middle"
              style={{ pointerEvents: 'none' }}
            >
              {markup.measurementUnit === 'mm' ? markup.measurementValue?.toFixed(0) : markup.measurementValue?.toFixed(2)} {markup.measurementUnit}
            </text>
          </g>
        );

      case 'measure-multiline':
        const multilinePathData = markup.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const lastPoint = markup.points[markup.points.length - 1];
        return (
          <g key={markup.id} opacity={opacity}>
            <path d={multilinePathData} stroke={stroke} strokeWidth={strokeW} fill="none" />
            {markup.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={5} fill={stroke} />
            ))}
            <text
              x={lastPoint.x + 10}
              y={lastPoint.y}
              fill={stroke}
              fontSize={16}
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              Total: {markup.measurementUnit === 'mm' ? markup.measurementValue?.toFixed(0) : markup.measurementValue?.toFixed(2)} {markup.measurementUnit}
            </text>
          </g>
        );

      case 'measure-area':
        const areaPathData = [...markup.points, markup.points[0]].map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return (
          <g key={markup.id} opacity={opacity}>
            <path
              d={areaPathData}
              stroke={stroke}
              strokeWidth={strokeW}
              fill={markup.fillColor || stroke}
              fillOpacity={markup.fillOpacity || 0.2}
            />
            {markup.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={5} fill={stroke} />
            ))}
            <text
              x={markup.points[0].x}
              y={markup.points[0].y - 10}
              fill={stroke}
              fontSize={16}
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              Area: {markup.measurementValue?.toFixed(2)} {markup.measurementUnit}
            </text>
          </g>
        );

      default:
        return null;
    }
  };

  const generateCloudPath = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const bumps = Math.max(8, Math.floor((width + height) / 40));

    let path = `M ${x} ${y + height / 2}`;

    for (let i = 0; i <= bumps; i++) {
      const angle = (i / bumps) * Math.PI * 2;
      const bumpX = x + width / 2 + (width / 2) * Math.cos(angle);
      const bumpY = y + height / 2 + (height / 2) * Math.sin(angle);
      const prevAngle = ((i - 1) / bumps) * Math.PI * 2;
      const prevX = x + width / 2 + (width / 2) * Math.cos(prevAngle);
      const prevY = y + height / 2 + (height / 2) * Math.sin(prevAngle);

      const cpX1 = prevX + (width / 15) * Math.cos(prevAngle + Math.PI / 2);
      const cpY1 = prevY + (height / 15) * Math.sin(prevAngle + Math.PI / 2);
      const cpX2 = bumpX - (width / 15) * Math.cos(angle + Math.PI / 2);
      const cpY2 = bumpY - (height / 15) * Math.sin(angle + Math.PI / 2);

      if (i === 0) {
        path = `M ${bumpX} ${bumpY}`;
      } else {
        path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${bumpX} ${bumpY}`;
      }
    }

    path += ' Z';
    return path;
  };

  const renderCurrentDrawing = () => {
    if (currentTool === 'polygon' && polygonPoints.length > 0) {
      return (
        <g>
          {polygonPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill={currentColor} />
          ))}
          {polygonPoints.length > 1 && (
            <polyline
              points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
              stroke={currentColor}
              strokeWidth={strokeWidth}
              fill="none"
              opacity={0.7}
            />
          )}
        </g>
      );
    }

    if (currentTool === 'multiline' && multiLinePoints.length > 0) {
      return (
        <g>
          {multiLinePoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill={currentColor} />
          ))}
          {multiLinePoints.length > 1 && (
            <polyline
              points={multiLinePoints.map(p => `${p.x},${p.y}`).join(' ')}
              stroke={currentColor}
              strokeWidth={strokeWidth}
              fill="none"
              opacity={0.7}
            />
          )}
        </g>
      );
    }

    if (!isDrawing || !startPoint) return null;

    const mouse = currentPath[currentPath.length - 1];
    if (!mouse) return null;

    switch (currentTool) {
      case 'pen':
      case 'highlighter':
        const pathData = currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return (
          <path
            d={pathData}
            stroke={currentColor}
            strokeWidth={currentTool === 'highlighter' ? strokeWidth * 3 : strokeWidth}
            fill="none"
            opacity={currentTool === 'highlighter' ? 0.3 : 0.7}
            strokeLinecap={currentTool === 'highlighter' ? 'round' : 'butt'}
          />
        );

      case 'line':
      case 'dimension':
        return (
          <line
            x1={startPoint.x}
            y1={startPoint.y}
            x2={mouse.x}
            y2={mouse.y}
            stroke={currentColor}
            strokeWidth={strokeWidth}
            opacity={0.7}
          />
        );

      case 'arrow':
        const angle = Math.atan2(mouse.y - startPoint.y, mouse.x - startPoint.x);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;
        return (
          <g opacity={0.7}>
            <line
              x1={startPoint.x}
              y1={startPoint.y}
              x2={mouse.x}
              y2={mouse.y}
              stroke={currentColor}
              strokeWidth={strokeWidth}
            />
            <line
              x1={mouse.x}
              y1={mouse.y}
              x2={mouse.x - arrowLength * Math.cos(angle - arrowAngle)}
              y2={mouse.y - arrowLength * Math.sin(angle - arrowAngle)}
              stroke={currentColor}
              strokeWidth={strokeWidth}
            />
            <line
              x1={mouse.x}
              y1={mouse.y}
              x2={mouse.x - arrowLength * Math.cos(angle + arrowAngle)}
              y2={mouse.y - arrowLength * Math.sin(angle + arrowAngle)}
              stroke={currentColor}
              strokeWidth={strokeWidth}
            />
          </g>
        );

      case 'rectangle':
        const width = mouse.x - startPoint.x;
        const height = mouse.y - startPoint.y;
        return (
          <rect
            x={startPoint.x}
            y={startPoint.y}
            width={width}
            height={height}
            stroke={currentColor}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.7}
          />
        );

      case 'circle':
        const radius = Math.hypot(mouse.x - startPoint.x, mouse.y - startPoint.y);
        return (
          <circle
            cx={startPoint.x}
            cy={startPoint.y}
            r={radius}
            stroke={currentColor}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.7}
          />
        );

      case 'ellipse':
        const rx = Math.abs(mouse.x - startPoint.x);
        const ry = Math.abs(mouse.y - startPoint.y);
        const cx = (startPoint.x + mouse.x) / 2;
        const cy = (startPoint.y + mouse.y) / 2;
        return (
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            stroke={currentColor}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.7}
          />
        );

      case 'triangle':
        const p1 = startPoint;
        const p2 = mouse;
        const p3x = p1.x - (p2.x - p1.x);
        const trianglePoints = `${p1.x},${p2.y} ${p2.x},${p2.y} ${p3x},${p1.y}`;
        return (
          <polygon
            points={trianglePoints}
            stroke={currentColor}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.7}
          />
        );

      case 'cloud':
        const cloudPath = generateCloudPath(startPoint, mouse);
        return (
          <path
            d={cloudPath}
            stroke={currentColor}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.7}
          />
        );

      case 'issue':
        return (
          <g opacity={0.7}>
            <rect
              x={startPoint.x - 5}
              y={startPoint.y - 18}
              width={50}
              height={24}
              fill={currentColor}
              opacity={0.1}
            />
            <text
              x={startPoint.x}
              y={startPoint.y}
              fill={currentColor}
              fontSize={16}
              fontWeight="bold"
            >
              Issue
            </text>
          </g>
        );

      default:
        return null;
    }
  };

  const renderSelectionBox = () => {
    if (!selectionBox) return null;

    const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
    const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
    const width = Math.abs(selectionBox.end.x - selectionBox.start.x);
    const height = Math.abs(selectionBox.end.y - selectionBox.start.y);

    return (
      <rect
        x={minX}
        y={minY}
        width={width}
        height={height}
        stroke="#00FF00"
        strokeWidth={1}
        fill="rgba(0, 255, 0, 0.1)"
        strokeDasharray="5,5"
      />
    );
  };

  const renderCalibrationLine = () => {
    if (!calibrationLine) return null;

    const pixelLength = calculatePixelDistance(calibrationLine.start, calibrationLine.end);

    return (
      <g>
        <line
          x1={calibrationLine.start.x}
          y1={calibrationLine.start.y}
          x2={calibrationLine.end.x}
          y2={calibrationLine.end.y}
          stroke="blue"
          strokeWidth={3}
          strokeDasharray="10,5"
        />
        <circle cx={calibrationLine.start.x} cy={calibrationLine.start.y} r={5} fill="blue" />
        <circle cx={calibrationLine.end.x} cy={calibrationLine.end.y} r={5} fill="blue" />
        <text
          x={(calibrationLine.start.x + calibrationLine.end.x) / 2}
          y={(calibrationLine.start.y + calibrationLine.end.y) / 2 - 10}
          fill="blue"
          fontSize={14}
          fontWeight="bold"
        >
          {pixelLength.toFixed(1)}px
        </text>
      </g>
    );
  };

  const renderMeasurements = () => {
    if (!measureTool || measurePoints.length === 0) return null;

    return (
      <g>
        {measurePoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5} fill="green" />
        ))}
        {measurePoints.length >= 2 && (measureTool === 'multiline' || measureTool === 'area') && (
          <path
            d={measurePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
            stroke="green"
            strokeWidth={3}
            fill="none"
            opacity={0.5}
            strokeDasharray="5,5"
          />
        )}
      </g>
    );
  };

  const updatePhotoPinPosition = async (pinId: string, x: number, y: number) => {
    try {
      const { error } = await supabase
        .from('drawing_photo_pins')
        .update({
          x_coordinate: x,
          y_coordinate: y,
        })
        .eq('id', pinId);

      if (error) throw error;
      fetchPhotoPins();
    } catch (error) {
      console.error('Error updating photo pin position:', error);
      alert('Failed to update pin position');
    }
  };

  const handlePinMouseDown = (e: React.MouseEvent, pinId: string) => {
    if (currentTool !== 'select') return;
    e.stopPropagation();
    setDraggingPinId(pinId);
  };

  const handlePinDoubleClick = (e: React.MouseEvent, pinId: string) => {
    e.stopPropagation();
    setSelectedPinId(pinId);
    setShowPhotoPinViewer(true);
  };

  const renderPhotoPins = () => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;

    return getVisiblePhotoPins().map(pin => {
      const pinX = pin.x_coordinate * canvas.width;
      const pinY = pin.y_coordinate * canvas.height;
      const isSelected = pin.id === selectedPinId;

      const isDragging = draggingPinId === pin.id;

      return (
        <g
          key={pin.id}
          onClick={() => setSelectedPinId(pin.id)}
          onMouseDown={(e) => handlePinMouseDown(e, pin.id)}
          onDoubleClick={(e) => handlePinDoubleClick(e, pin.id)}
          style={{ cursor: currentTool === 'select' ? (isDragging ? 'grabbing' : 'grab') : 'pointer' }}
        >
          {isSelected && (
            <circle
              cx={pinX}
              cy={pinY}
              r={50}
              fill="rgba(59, 130, 246, 0.2)"
            />
          )}
          <circle
            cx={pinX}
            cy={pinY}
            r={20}
            fill={pin.photo_id ? (isDragging ? '#1E40AF' : (isSelected ? '#2563EB' : '#3B82F6')) : (isDragging ? '#9CA3AF' : (isSelected ? '#6B7280' : '#9CA3AF'))}
            stroke="#FFFFFF"
            strokeWidth={isDragging ? 4 : (isSelected ? 3 : 2)}
          />
          <text
            x={pinX}
            y={pinY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={16}
            fill="#FFFFFF"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {pin.photo_id ? '📷' : '📍'}
          </text>
          {pin.label && (
            <text
              x={pinX}
              y={pinY + 35}
              textAnchor="middle"
              fontSize={12}
              fill="#FFFFFF"
              stroke="#000000"
              strokeWidth={0.5}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {pin.label}
            </text>
          )}
        </g>
      );
    });
  };

  const handleZoomIn = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const pointX = (centerX - pan.x) / zoom;
    const pointY = (centerY - pan.y) / zoom;

    const newZoom = Math.min(5, zoom + 0.25);
    const newPanX = centerX - pointX * newZoom;
    const newPanY = centerY - pointY * newZoom;

    isInitialLoadRef.current = false;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomOut = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const pointX = (centerX - pan.x) / zoom;
    const pointY = (centerY - pan.y) / zoom;

    const newZoom = Math.max(0.1, zoom - 0.25);
    const newPanX = centerX - pointX * newZoom;
    const newPanY = centerY - pointY * newZoom;

    isInitialLoadRef.current = false;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleResetView = () => {
    if (!containerRef.current || !pageSize.width || !pageSize.height) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const scaleX = (containerWidth - 80) / pageSize.width;
    const scaleY = (containerHeight - 80) / pageSize.height;
    const fitZoom = Math.min(scaleX, scaleY);

    const scaledWidth = pageSize.width * fitZoom;
    const scaledHeight = pageSize.height * fitZoom;
    const centerX = (containerWidth - scaledWidth) / 2;
    const centerY = (containerHeight - scaledHeight) / 2;

    isInitialLoadRef.current = false;
    setZoom(fitZoom);
    setPan({ x: centerX, y: centerY });
  };
  const goToNextPage = () => setCurrentPage(Math.min(totalPages, currentPage + 1));
  const goToPreviousPage = () => setCurrentPage(Math.max(1, currentPage - 1));

  const handleRotate = () => {
    setDrawingRotation((prev) => (prev + 90) % 360);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const hasGroupedSelection = markups.some(m => selectedMarkupIds.has(m.id) && m.groupId);

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      <DrawingViewerToolbar
        currentTool={currentTool}
        currentColor={currentColor}
        strokeWidth={strokeWidth}
        scale={scale}
        zoom={zoom}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        isCalibrating={isCalibrating}
        currentPage={currentPage}
        totalPages={totalPages}
        sheetInfo={`${sheet.sheet_number} - v${version.version_number}`}
        onToolChange={(tool) => {
          setCurrentTool(tool);
          setMeasureTool(null);
          setMeasurePoints([]);
          if (tool === 'symbol') {
            setShowSymbolsPalette(true);
          } else {
            setShowSymbolsPalette(false);
          }
          if (tool === 'measure-line') { setMeasureTool('line'); setMeasurePoints([]); }
          if (tool === 'measure-multiline') { setMeasureTool('multiline'); setMeasurePoints([]); }
          if (tool === 'measure-area') { setMeasureTool('area'); setMeasurePoints([]); }
        }}
        onColorChange={setCurrentColor}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRotate={handleRotate}
        onFullscreen={handleFullscreen}
        onCalibrate={() => setIsCalibrating(true)}
        onSettings={() => setShowEditDrawingModal(true)}
        onFilter={() => setShowFilterPanel(true)}
        onClose={onClose}
        onPreviousPage={goToPreviousPage}
        onNextPage={goToNextPage}
      />

      <div ref={containerRef} className="flex-1 overflow-hidden bg-gray-700 relative md:ml-0 ml-14 md:mt-0 mt-12" style={{ touchAction: 'none' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="mt-4 text-white">Loading PDF...</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md mx-auto p-6 bg-red-900 bg-opacity-50 rounded-lg">
              <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">Failed to Load Drawing</h3>
              <p className="text-red-200 mb-4">{loadError}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={loadPDF}
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
          </div>
        ) : (
          <div
            className="absolute top-0 left-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <div
              style={{
                transform: `rotate(${drawingRotation}deg)`,
                transformOrigin: `${pageSize.width / 2}px ${pageSize.height / 2}px`,
                transition: 'transform 0.3s ease-out',
              }}
            >
              <canvas ref={canvasRef} className="block bg-white" />
            <svg
              ref={svgRef}
              onMouseDown={vertexEditMode ? undefined : handleMouseDown}
              onMouseMove={vertexEditMode ? undefined : handleMouseMove}
              onMouseUp={vertexEditMode ? undefined : handleMouseUp}
              onTouchStart={vertexEditMode ? undefined : handleTouchStart}
              onTouchMove={vertexEditMode ? undefined : handleTouchMove}
              onTouchEnd={vertexEditMode ? undefined : handleTouchEnd}
              onClick={(e) => {
                if (vertexEditMode) {
                  if (e.target === svgRef.current) {
                    setVertexEditMode(null);
                  }
                } else {
                  handleSVGClick(e);
                }
              }}
              onDoubleClick={(e) => {
                if (vertexEditMode) return;
                if (currentTool === 'select' && selectedMarkupIds.size === 1) {
                  const selectedId = Array.from(selectedMarkupIds)[0];
                  const markup = markups.find(m => m.id === selectedId);
                  if (markup && !markup.locked) {
                    handleEnterVertexEditMode(selectedId);
                  }
                } else {
                  handleSVGDoubleClick(e);
                }
              }}
              onAuxClick={(e) => {
                e.preventDefault();
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (currentTool === 'select' && selectedMarkupIds.size > 0) {
                  const selectedId = Array.from(selectedMarkupIds)[0];
                  setContextMenu({ x: e.clientX, y: e.clientY, markupId: selectedId });
                }
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                cursor: currentTool === 'pan' || isPanning ? (isPanning ? 'grabbing' : 'grab') : currentTool === 'select' ? 'pointer' : 'crosshair',
              }}
            >
              {getVisibleMarkups()
                .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                .map(renderMarkup)}
              {getVisibleMarkups()
                .filter(m => selectedMarkupIds.has(m.id))
                .map(markup => {
                  const measurementTools: Tool[] = ['measure-line', 'measure-multiline', 'measure-area'];
                  const isMeasurement = measurementTools.includes(markup.tool);
                  const vertexEditableTools: Tool[] = ['pen', 'multiline', 'polygon', 'cloud', 'measure-line', 'measure-multiline', 'measure-area'];
                  const showVertexHandles = vertexEditableTools.includes(markup.tool);
                  const isInVertexEditMode = vertexEditMode === markup.id;

                  return (
                    <g key={`controls-${markup.id}`}>
                      {!showVertexHandles && !isInVertexEditMode && (
                        <>
                          <SelectionOutline markup={markup} zoom={zoom} />
                          {!markup.locked && !isResizing && showResizeHandles && markup.tool !== 'highlighter' && markup.tool !== 'photo' && (
                            markup.tool === 'symbol' ? (
                              <SymbolResizeHandles
                                markup={markup}
                                zoom={zoom}
                                onResize={(newSize) => {
                                  const updatedMarkup = { ...markup, symbolSize: newSize };
                                  const newMarkups = markups.map(m => m.id === markup.id ? updatedMarkup : m);
                                  setMarkups(newMarkups);
                                  updateMarkup(updatedMarkup);
                                }}
                              />
                            ) : (
                              <ResizeHandles
                                markup={markup}
                                zoom={zoom}
                                onResize={(handleIndex, newX, newY) => {
                                  setIsResizing(true);
                                  handleResizeMarkup(markup.id, handleIndex, newX, newY);
                                }}
                              />
                            )
                          )}
                        </>
                      )}
                      {!markup.locked && (showVertexHandles || isInVertexEditMode) && (
                        <VertexEditHandles
                          markup={markup}
                          zoom={zoom}
                          onMoveVertex={(index, x, y) => handleMoveVertex(markup.id, index, x, y)}
                          onAddVertex={(index, x, y) => handleAddVertex(markup.id, index, x, y)}
                          onDeleteVertex={(index) => handleDeleteVertex(markup.id, index)}
                        />
                      )}
                    </g>
                  );
                })}
              {renderCurrentDrawing()}
              {renderSelectionBox()}
              {renderCalibrationLine()}
              {renderMeasurements()}
              {renderPhotoPins()}
            </svg>
            </div>
          </div>
        )}
      </div>

      {showPhotoAttachModal && photoClickPosition && (
        <DrawingPhotoAttachModal
          sheetId={sheet.id}
          projectId={sheet.project_id}
          x={photoClickPosition.x}
          y={photoClickPosition.y}
          addToExistingPin={isAddingToExistingPin}
          onClose={() => {
            setShowPhotoAttachModal(false);
            setPhotoClickPosition(null);
            setIsAddingToExistingPin(false);
          }}
          onSuccess={handlePhotoAttached}
        />
      )}

      {showPhotoPinViewer && selectedPinId && (() => {
        const pin = photoPins.find(p => p.id === selectedPinId);
        if (!pin) return null;
        return (
          <DrawingPhotoPinViewer
            sheetId={sheet.id}
            x={pin.x_coordinate}
            y={pin.y_coordinate}
            onClose={() => {
              setShowPhotoPinViewer(false);
              setSelectedPinId(null);
            }}
            onUpdate={() => {
              fetchPhotoPins();
            }}
            onAddMore={() => {
              setShowPhotoPinViewer(false);
              setPhotoClickPosition({ x: pin.x_coordinate, y: pin.y_coordinate });
              setIsAddingToExistingPin(true);
              setShowPhotoAttachModal(true);
            }}
          />
        );
      })()}

      {showSymbolsPalette && (
        <DrawingSymbolsPalette
          onSelectSymbol={handleSymbolSelect}
          onClose={() => setShowSymbolsPalette(false)}
        />
      )}

      {showScaleDialog && calibrationLine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Set Scale</h2>
            <p className="text-sm text-gray-600 mb-4">
              You have drawn a line of {calculatePixelDistance(calibrationLine.start, calibrationLine.end).toFixed(1)} pixels.
              Enter the real-world measurement for this distance.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Real Distance</label>
                <input
                  type="number"
                  value={scaleInput}
                  onChange={(e) => setScaleInput(e.target.value)}
                  className="w-full bg-white border-2 border-blue-500 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter distance"
                  step="0.01"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Unit</label>
                <select
                  value={scaleUnit}
                  onChange={(e) => setScaleUnit(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mm">Millimeters (mm)</option>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="m">Meters (m)</option>
                  <option value="in">Inches (in)</option>
                  <option value="ft">Feet (ft)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowScaleDialog(false);
                  setCalibrationLine(null);
                  setIsCalibrating(false);
                  setScaleInput('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScaleSet}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Set Scale
              </button>
            </div>
          </div>
        </div>
      )}

      {currentTool === 'select' && selectedMarkupIds.size > 0 && !vertexEditMode && showActionBar && (
        (() => {
          const selectedIds = Array.from(selectedMarkupIds);
          const selectedMarkups = markups.filter(m => selectedMarkupIds.has(m.id));
          if (selectedMarkups.length === 0) return null;

          let allBounds = selectedMarkups.map(m => getMarkupBounds(m));
          const minX = Math.min(...allBounds.map(b => b.minX));
          const maxX = Math.max(...allBounds.map(b => b.maxX));
          const minY = Math.min(...allBounds.map(b => b.minY));

          const centerX = (minX + maxX) / 2;

          const screenX = centerX * zoom + pan.x;
          const screenY = minY * zoom + pan.y;

          const firstMarkup = selectedMarkups[0];
          const allSameColor = selectedMarkups.every(m => m.color === firstMarkup.color);
          const allSameStrokeWidth = selectedMarkups.every(m => m.strokeWidth === firstMarkup.strokeWidth);
          const allSameFillColor = selectedMarkups.every(m => m.fillColor === firstMarkup.fillColor);
          const allSameFillOpacity = selectedMarkups.every(m => m.fillOpacity === firstMarkup.fillOpacity);
          const anyLocked = selectedMarkups.some(m => m.locked);

          const fillableTools: Tool[] = ['rectangle', 'circle', 'ellipse', 'triangle', 'polygon', 'cloud'];
          const hasFillableShape = selectedMarkups.some(m => fillableTools.includes(m.tool));
          const isTextMarkup = selectedMarkups.length === 1 && (firstMarkup.tool === 'text' || firstMarkup.tool === 'issue');
          const allSameTextAlign = selectedMarkups.every(m => m.textAlign === firstMarkup.textAlign);
          const allSameFontSize = selectedMarkups.every(m => (m.fontSize || 16) === (firstMarkup.fontSize || 16));
          const vertexEditableTools: Tool[] = ['pen', 'multiline', 'polygon', 'cloud'];
          const canEditVertices = selectedMarkups.length === 1 && vertexEditableTools.includes(firstMarkup.tool);

          return (
            <MarkupActionBar
              position={{ x: screenX, y: screenY }}
              isLocked={anyLocked}
              color={allSameColor ? firstMarkup.color : '#FF0000'}
              strokeWidth={allSameStrokeWidth ? firstMarkup.strokeWidth : 2}
              fillColor={allSameFillColor ? firstMarkup.fillColor : undefined}
              fillOpacity={allSameFillOpacity ? firstMarkup.fillOpacity : 1}
              showFillControls={hasFillableShape}
              multipleSelected={selectedMarkups.length > 1}
              isTextMarkup={isTextMarkup}
              textAlign={allSameTextAlign ? firstMarkup.textAlign : 'left'}
              fontSize={allSameFontSize ? (firstMarkup.fontSize || 16) : 16}
              onColorChange={(color) => {
                const newMarkups = markups.map(m =>
                  selectedMarkupIds.has(m.id) && !m.locked ? { ...m, color } : m
                );
                setMarkups(newMarkups);
                selectedMarkups.forEach(m => {
                  if (!m.locked) updateMarkup({ ...m, color });
                });
              }}
              onStrokeWidthChange={(strokeWidth) => {
                const newMarkups = markups.map(m =>
                  selectedMarkupIds.has(m.id) && !m.locked ? { ...m, strokeWidth } : m
                );
                setMarkups(newMarkups);
                selectedMarkups.forEach(m => {
                  if (!m.locked) updateMarkup({ ...m, strokeWidth });
                });
              }}
              onFillColorChange={hasFillableShape ? (fillColor) => {
                const newMarkups = markups.map(m =>
                  selectedMarkupIds.has(m.id) && !m.locked ? { ...m, fillColor: fillColor || undefined } : m
                );
                setMarkups(newMarkups);
                selectedMarkups.forEach(m => {
                  if (!m.locked) updateMarkup({ ...m, fillColor: fillColor || undefined });
                });
              } : undefined}
              onFillOpacityChange={hasFillableShape ? (fillOpacity) => {
                const newMarkups = markups.map(m =>
                  selectedMarkupIds.has(m.id) && !m.locked ? { ...m, fillOpacity } : m
                );
                setMarkups(newMarkups);
                selectedMarkups.forEach(m => {
                  if (!m.locked) updateMarkup({ ...m, fillOpacity });
                });
              } : undefined}
              onTextAlignChange={isTextMarkup ? (textAlign) => {
                const newMarkups = markups.map(m =>
                  selectedMarkupIds.has(m.id) && !m.locked ? { ...m, textAlign } : m
                );
                setMarkups(newMarkups);
                selectedMarkups.forEach(m => {
                  if (!m.locked) updateMarkup({ ...m, textAlign });
                });
              } : undefined}
              onFontSizeChange={isTextMarkup ? (fontSize) => {
                const newMarkups = markups.map(m =>
                  selectedMarkupIds.has(m.id) && !m.locked ? { ...m, fontSize } : m
                );
                setMarkups(newMarkups);
                selectedMarkups.forEach(m => {
                  if (!m.locked) updateMarkup({ ...m, fontSize });
                });
              } : undefined}
              onEditText={isTextMarkup && !firstMarkup.locked ? () => {
                setTextInputPosition(firstMarkup.points[0]);
                setTextInputTool(firstMarkup.tool as 'text' | 'issue');
                setTextInputValue(firstMarkup.text || '');
                setShowTextInput(true);
              } : undefined}
              canEditVertices={canEditVertices && !firstMarkup.locked}
              onEditVertices={canEditVertices && !firstMarkup.locked ? () => {
                setVertexEditMode(firstMarkup.id);
                setShowVertexHandles(true);
              } : undefined}
              onAlignLeft={selectedMarkups.length > 1 ? handleAlignLeft : undefined}
              onAlignCenter={selectedMarkups.length > 1 ? handleAlignCenter : undefined}
              onAlignRight={selectedMarkups.length > 1 ? handleAlignRight : undefined}
              onAlignTop={selectedMarkups.length > 1 ? handleAlignTop : undefined}
              onAlignMiddle={selectedMarkups.length > 1 ? handleAlignMiddle : undefined}
              onAlignBottom={selectedMarkups.length > 1 ? handleAlignBottom : undefined}
              onDuplicate={() => handleDuplicateMarkup(selectedIds)}
              onDelete={() => deleteSelectedMarkups()}
              onLock={() => {
                const newMarkups = markups.map(m => {
                  if (selectedMarkupIds.has(m.id)) {
                    return { ...m, locked: !anyLocked };
                  }
                  return m;
                });
                setMarkups(newMarkups);
                selectedMarkups.forEach(m => {
                  updateMarkup({ ...m, locked: !anyLocked });
                });
              }}
              onBringToFront={() => {
                selectedIds.forEach(id => handleBringToFront(id));
              }}
              onSendToBack={() => {
                selectedIds.forEach(id => handleSendToBack(id));
              }}
            />
          );
        })()
      )}

      {vertexEditMode && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 text-sm">
          <Edit3 size={16} />
          <span>Editing Points • Double-click vertex to delete • Click outside to exit</span>
        </div>
      )}

      {showTextInput && textInputPosition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">
              {textInputTool === 'issue' ? 'Enter Issue Description' : 'Enter Text'}
            </h3>
            <textarea
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 mb-4 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your text here... (use Enter for new lines)"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowTextInput(false);
                  setTextInputValue('');
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowTextInput(false);
                  setTextInputValue('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (textInputValue.trim()) {
                    const selectedMarkup = markups.find(m => selectedMarkupIds.has(m.id));
                    if (selectedMarkup && (selectedMarkup.tool === 'text' || selectedMarkup.tool === 'issue')) {
                      const updatedMarkup = { ...selectedMarkup, text: textInputValue };
                      const newMarkups = markups.map(m => m.id === selectedMarkup.id ? updatedMarkup : m);
                      setMarkups(newMarkups);
                      updateMarkup(updatedMarkup);
                    } else {
                      createTextMarkup(textInputPosition, textInputValue, textInputTool);
                    }
                  }
                  setShowTextInput(false);
                  setTextInputValue('');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {selectedMarkupIds.size > 0 && markups.find(m => selectedMarkupIds.has(m.id) && (m.tool === 'text' || m.tool === 'issue')) ? 'Update Text' : 'Add Text'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditDrawingModal && (
        <DrawingEditModal
          sheet={sheet}
          sets={drawingSets}
          onClose={() => setShowEditDrawingModal(false)}
          onUpdated={() => {
            setShowEditDrawingModal(false);
            onUpdate();
          }}
        />
      )}

      {showFilterPanel && (
        <MarkupFilterPanel
          availableTypes={getAvailableMarkupTypes()}
          visibleTypes={visibleMarkupTypes}
          onToggleType={handleToggleMarkupType}
          onToggleAll={handleToggleAllMarkupTypes}
          onClose={() => setShowFilterPanel(false)}
        />
      )}
    </div>
  );
}
