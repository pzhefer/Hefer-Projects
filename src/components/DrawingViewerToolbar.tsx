import { useState, useRef, useEffect } from 'react';
import {
  Undo, Redo, MousePointer2, Move, Pen, Square, Shapes, Type, Ruler,
  MessageSquare, Camera, ZoomIn, ZoomOut, RotateCw, Maximize, Settings,
  ChevronDown, Minus, Edit3, ArrowRight, Highlighter, Circle, Triangle,
  Hexagon, Cloud, AlertCircle, ClipboardList, FileText, Clock, AlertTriangle, Eye, X, ChevronLeft, ChevronRight, ScanLine, Palette, Filter
} from 'lucide-react';

type Tool = 'select' | 'pan' | 'pen' | 'line' | 'multiline' | 'arrow' | 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'polygon' | 'cloud' | 'text' | 'dimension' | 'issue' | 'highlighter' | 'photo' | 'symbol' | 'measure' | 'measure-line' | 'measure-multiline' | 'measure-area';

interface ToolbarProps {
  currentTool: Tool;
  currentColor: string;
  strokeWidth: number;
  scale: number | null;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  isCalibrating: boolean;
  currentPage: number;
  totalPages: number;
  sheetInfo: string;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onFullscreen: () => void;
  onCalibrate: () => void;
  onSettings: () => void;
  onFilter: () => void;
  onClose: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

interface ToolGroup {
  id: string;
  icon: React.ElementType;
  label: string;
  tools: { id: Tool; icon: React.ElementType; label: string }[];
}

export default function DrawingViewerToolbar({
  currentTool,
  currentColor,
  strokeWidth,
  scale,
  zoom,
  canUndo,
  canRedo,
  isCalibrating,
  currentPage,
  totalPages,
  sheetInfo,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onRotate,
  onFullscreen,
  onCalibrate,
  onSettings,
  onFilter,
  onClose,
  onPreviousPage,
  onNextPage,
}: ToolbarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const sizePickerRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FFA500', '#FF00FF', '#00FFFF', '#800080', '#000000', '#FFFFFF'];
  const strokeWidths = [1, 2, 3, 5, 8];

  const toolGroups: ToolGroup[] = [
    {
      id: 'line',
      icon: Pen,
      label: 'Line',
      tools: [
        { id: 'pen', icon: Pen, label: 'Freehand' },
        { id: 'line', icon: Minus, label: 'Line' },
        { id: 'multiline', icon: Edit3, label: 'Multi-Line' },
        { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
        { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
      ],
    },
    {
      id: 'shape',
      icon: Square,
      label: 'Shape',
      tools: [
        { id: 'rectangle', icon: Square, label: 'Rectangle' },
        { id: 'circle', icon: Circle, label: 'Circle' },
        { id: 'triangle', icon: Triangle, label: 'Triangle' },
        { id: 'polygon', icon: Hexagon, label: 'Polygon' },
        { id: 'cloud', icon: Cloud, label: 'Cloud' },
      ],
    },
    {
      id: 'measure',
      icon: Ruler,
      label: 'Measure',
      tools: [
        { id: 'measure-line', icon: Minus, label: 'Line Measurement' },
        { id: 'measure-multiline', icon: Edit3, label: 'Multi-Line Measurement' },
        { id: 'measure-area', icon: Hexagon, label: 'Area Measurement' },
      ],
    },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedOutsideColor = colorPickerRef.current && !colorPickerRef.current.contains(target);
      const clickedOutsideSize = sizePickerRef.current && !sizePickerRef.current.contains(target);
      const clickedOutsideDropdown = Object.values(dropdownRefs.current).every(ref => !ref || !ref.contains(target));

      if (clickedOutsideColor && clickedOutsideSize && clickedOutsideDropdown) {
        setOpenDropdown(null);
        setShowColorPicker(false);
        setShowSizePicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGroupClick = (groupId: string) => {
    setOpenDropdown(openDropdown === groupId ? null : groupId);
  };

  const handleToolSelect = (tool: Tool) => {
    onToolChange(tool);
    setOpenDropdown(null);
  };

  const getActiveToolInGroup = (group: ToolGroup) => {
    return group.tools.find(t => t.id === currentTool);
  };

  return (
    <>
      {/* Desktop Toolbar - Top */}
      <div className="hidden md:flex bg-gray-800 text-white border-b border-gray-700 px-4 py-2 items-center justify-between relative z-50">
        {/* Left Section */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-300 mr-2">{sheetInfo}</span>

          <div className="w-px h-6 bg-gray-600 mx-1"></div>

          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 hover:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo size={18} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 hover:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo size={18} />
          </button>

          <div className="w-px h-6 bg-gray-600 mx-1"></div>

          <button
            onClick={() => onToolChange('select')}
            className={`p-2 rounded ${currentTool === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Select"
          >
            <MousePointer2 size={18} />
          </button>
          <button
            onClick={() => onToolChange('pan')}
            className={`p-2 rounded ${currentTool === 'pan' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Pan"
          >
            <Move size={18} />
          </button>

          <div className="w-px h-6 bg-gray-600 mx-1"></div>

          {/* Color Picker */}
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowSizePicker(false);
                setOpenDropdown(null);
              }}
              className="p-2 hover:bg-gray-700 rounded flex items-center space-x-1"
              title="Color"
            >
              <div className="w-5 h-5 rounded border-2 border-white" style={{ backgroundColor: currentColor }} />
              <ChevronDown size={14} />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-xl p-3 grid grid-cols-5 gap-2 z-[100]">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      onColorChange(color);
                      setShowColorPicker(false);
                    }}
                    className={`w-10 h-10 rounded-lg hover:scale-110 transition-transform ${
                      currentColor === color ? 'ring-4 ring-blue-500' : 'ring-2 ring-gray-700'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Size Picker */}
          <div className="relative" ref={sizePickerRef}>
            <button
              onClick={() => {
                setShowSizePicker(!showSizePicker);
                setShowColorPicker(false);
                setOpenDropdown(null);
              }}
              className="px-3 py-2 hover:bg-gray-700 rounded flex items-center space-x-1 text-xs font-medium"
              title="Stroke Width"
            >
              {strokeWidth}px
              <ChevronDown size={14} />
            </button>
            {showSizePicker && (
              <div className="absolute top-full left-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl p-1 z-[100] min-w-[100px]">
                {strokeWidths.map(width => (
                  <button
                    key={width}
                    onClick={() => {
                      onStrokeWidthChange(width);
                      setShowSizePicker(false);
                    }}
                    className={`block w-full px-4 py-2 text-xs text-left hover:bg-gray-600 rounded ${
                      strokeWidth === width ? 'bg-blue-600' : ''
                    }`}
                  >
                    {width}px
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-600 mx-1"></div>

          {/* Tool Groups */}
          {toolGroups.map(group => {
            const activeTool = getActiveToolInGroup(group);
            const IconComponent = activeTool ? activeTool.icon : group.icon;
            return (
              <div key={group.id} className="relative" ref={(el) => dropdownRefs.current[group.id] = el}>
                <button
                  onClick={() => {
                    handleGroupClick(group.id);
                    setShowColorPicker(false);
                    setShowSizePicker(false);
                  }}
                  className={`p-2 rounded flex items-center space-x-1 ${
                    group.tools.some(t => t.id === currentTool) ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                  title={activeTool?.label || group.label}
                >
                  <IconComponent size={18} />
                  <ChevronDown size={14} />
                </button>
                {openDropdown === group.id && (
                  <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 z-[100] min-w-[200px]">
                    {group.tools.map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => handleToolSelect(tool.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-left hover:bg-gray-700 transition-colors ${
                          currentTool === tool.id ? 'bg-blue-600 text-white' : 'text-gray-200'
                        }`}
                      >
                        <tool.icon size={18} />
                        <span className="font-medium">{tool.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="w-px h-6 bg-gray-600 mx-1"></div>

          <button
            onClick={() => onToolChange('symbol')}
            className={`p-2 rounded ${currentTool === 'symbol' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Symbols"
          >
            <Shapes size={18} />
          </button>
          <button
            onClick={() => onToolChange('text')}
            className={`p-2 rounded ${currentTool === 'text' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Text"
          >
            <Type size={18} />
          </button>
          <button
            onClick={() => onToolChange('issue')}
            className={`p-2 rounded ${currentTool === 'issue' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Issue"
          >
            <MessageSquare size={18} />
          </button>
          <button
            onClick={() => onToolChange('photo')}
            className={`p-2 rounded ${currentTool === 'photo' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Photo"
          >
            <Camera size={18} />
          </button>

          <div className="w-px h-6 bg-gray-600 mx-1"></div>

          <button
            onClick={onCalibrate}
            className={`px-3 py-2 rounded text-xs font-medium ${isCalibrating ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            title="Calibrate"
          >
            <Ruler size={16} className="inline mr-1" />
            {scale ? `1:${Math.round(scale)}` : 'Calibrate'}
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          <button onClick={onPreviousPage} disabled={currentPage === 1} className="p-2 hover:bg-gray-700 rounded disabled:opacity-30" title="Previous Page">
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-medium min-w-[50px] text-center">{currentPage} / {totalPages}</span>
          <button onClick={onNextPage} disabled={currentPage === totalPages} className="p-2 hover:bg-gray-700 rounded disabled:opacity-30" title="Next Page">
            <ChevronRight size={18} />
          </button>

          <div className="w-px h-6 bg-gray-600 mx-1"></div>

          <button onClick={onZoomOut} className="p-2 hover:bg-gray-700 rounded" title="Zoom Out">
            <ZoomOut size={18} />
          </button>
          <span className="text-xs min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={onZoomIn} className="p-2 hover:bg-gray-700 rounded" title="Zoom In">
            <ZoomIn size={18} />
          </button>

          <div className="w-px h-6 bg-gray-600 mx-1"></div>

          <button onClick={onRotate} className="p-2 hover:bg-gray-700 rounded" title="Rotate">
            <RotateCw size={18} />
          </button>
          <button onClick={onFullscreen} className="p-2 hover:bg-gray-700 rounded" title="Fullscreen">
            <Maximize size={18} />
          </button>
          <button onClick={onSettings} className="p-2 hover:bg-gray-700 rounded" title="Drawing Properties">
            <Settings size={18} />
          </button>
          <button onClick={onFilter} className="p-2 hover:bg-gray-700 rounded" title="Filter Markup">
            <Filter size={18} />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded" title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Toolbar - Left Sidebar */}
      <div className="md:hidden fixed left-0 top-0 bottom-0 bg-gray-800 text-white border-r border-gray-700 flex flex-col items-center py-4 space-y-2 z-40 w-14 overflow-y-auto">
        <button
          onClick={onClose}
          className="p-2 hover:bg-red-600 bg-gray-700 rounded"
          title="Close"
        >
          <X size={20} />
        </button>

        <div className="w-8 h-px bg-gray-600 my-1"></div>

        <button
          onClick={() => onToolChange('select')}
          className={`p-2 rounded ${currentTool === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        >
          <MousePointer2 size={20} />
        </button>
        <button
          onClick={() => onToolChange('pan')}
          className={`p-2 rounded ${currentTool === 'pan' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        >
          <Move size={20} />
        </button>

        <div className="w-8 h-px bg-gray-600 my-1"></div>

        {toolGroups.map(group => {
          const IconComponent = group.icon;
          return (
            <div key={group.id} className="relative w-full flex justify-center" ref={(el) => dropdownRefs.current[`mobile-${group.id}`] = el}>
              <button
                onClick={() => handleGroupClick(group.id)}
                className={`p-2 rounded ${group.tools.some(t => t.id === currentTool) ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              >
                <IconComponent size={20} />
              </button>
              {openDropdown === group.id && (
                <div className="fixed left-14 bg-gray-900 border-2 border-gray-600 rounded-lg shadow-2xl py-2 z-[200] w-56" style={{ top: `${(dropdownRefs.current[`mobile-${group.id}`]?.getBoundingClientRect().top ?? 0)}px` }}>
                  {group.tools.map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolSelect(tool.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-base text-left hover:bg-gray-800 transition-colors ${
                        currentTool === tool.id ? 'bg-blue-600 text-white' : 'text-white'
                      }`}
                    >
                      <tool.icon size={20} />
                      <span className="font-semibold">{tool.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={() => onToolChange('symbol')}
          className={`p-2 rounded ${currentTool === 'symbol' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        >
          <Shapes size={20} />
        </button>
        <button
          onClick={() => onToolChange('text')}
          className={`p-2 rounded ${currentTool === 'text' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        >
          <Type size={20} />
        </button>
        <button
          onClick={() => onToolChange('issue')}
          className={`p-2 rounded ${currentTool === 'issue' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        >
          <MessageSquare size={20} />
        </button>
        <button
          onClick={() => onToolChange('photo')}
          className={`p-2 rounded ${currentTool === 'photo' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        >
          <Camera size={20} />
        </button>

        <div className="w-8 h-px bg-gray-600 my-1"></div>

        {/* Mobile Color Picker */}
        <div className="relative w-full flex justify-center" ref={(el) => { colorPickerRef.current = el; }}>
          <button
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowSizePicker(false);
              setOpenDropdown(null);
            }}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <div className="w-5 h-5 rounded border-2 border-white" style={{ backgroundColor: currentColor }} />
          </button>
          {showColorPicker && (
            <div className="fixed left-14 bg-gray-900 border-2 border-gray-600 rounded-lg shadow-2xl p-3 z-[200] w-64" style={{ top: `${(colorPickerRef.current?.getBoundingClientRect().top ?? 0)}px` }}>
              <div className="grid grid-cols-5 gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      onColorChange(color);
                      setShowColorPicker(false);
                    }}
                    className={`w-10 h-10 rounded-lg hover:scale-110 transition-transform ${
                      currentColor === color ? 'ring-4 ring-blue-500' : 'ring-2 ring-gray-700'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Stroke Width Picker */}
        <div className="relative w-full flex justify-center" ref={(el) => { sizePickerRef.current = el; }}>
          <button
            onClick={() => {
              setShowSizePicker(!showSizePicker);
              setShowColorPicker(false);
              setOpenDropdown(null);
            }}
            className="p-2 hover:bg-gray-700 rounded flex items-center justify-center"
          >
            <span className="text-xs font-bold">{strokeWidth}</span>
          </button>
          {showSizePicker && (
            <div className="fixed left-14 bg-gray-900 border-2 border-gray-600 rounded-lg shadow-2xl py-2 z-[200] w-48" style={{ top: `${(sizePickerRef.current?.getBoundingClientRect().top ?? 0)}px` }}>
              {strokeWidths.map(width => (
                <button
                  key={width}
                  onClick={() => {
                    onStrokeWidthChange(width);
                    setShowSizePicker(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors flex items-center space-x-3 ${
                    strokeWidth === width ? 'bg-blue-600 text-white' : 'text-white'
                  }`}
                >
                  <div className="w-12 h-0.5 bg-current" style={{ height: `${width}px` }} />
                  <span className="font-semibold">{width}px</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-8 h-px bg-gray-600 my-1"></div>

        <button onClick={onCalibrate} className={`p-2 rounded ${isCalibrating ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
          <ScanLine size={20} />
        </button>
        <button onClick={onUndo} disabled={!canUndo} className="p-2 hover:bg-gray-700 rounded disabled:opacity-30">
          <Undo size={20} />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className="p-2 hover:bg-gray-700 rounded disabled:opacity-30">
          <Redo size={20} />
        </button>
      </div>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-14 right-0 bg-gray-800 text-white border-b border-gray-700 px-4 py-2 flex items-center justify-between z-40">
        <div className="flex items-center space-x-2">
          <button onClick={onZoomOut} className="p-2 hover:bg-gray-700 rounded">
            <ZoomOut size={18} />
          </button>
          <span className="text-xs">{Math.round(zoom * 100)}%</span>
          <button onClick={onZoomIn} className="p-2 hover:bg-gray-700 rounded">
            <ZoomIn size={18} />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={onRotate} className="p-2 hover:bg-gray-700 rounded">
            <RotateCw size={18} />
          </button>
          <button onClick={onFullscreen} className="p-2 hover:bg-gray-700 rounded">
            <Maximize size={18} />
          </button>
          <button onClick={onSettings} className="p-2 hover:bg-gray-700 rounded">
            <Settings size={18} />
          </button>
          <button onClick={onFilter} className="p-2 hover:bg-gray-700 rounded">
            <Filter size={18} />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded">
            <X size={18} />
          </button>
        </div>
      </div>

    </>
  );
}
