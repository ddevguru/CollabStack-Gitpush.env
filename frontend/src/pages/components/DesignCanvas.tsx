import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Square, Circle, Type, Move, PenTool, Layers, Save, Download, Upload,
  Trash2, Copy, Undo, Redo, Palette, Minus, Plus, Grid, Lock, Unlock, Users, X
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';

interface DesignCanvasProps {
  projectId: string;
  designId?: string;
  onClose?: () => void;
}

interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  locked?: boolean;
  zIndex: number;
}

type Tool = 'select' | 'rectangle' | 'circle' | 'line' | 'text' | 'pen';

export default function DesignCanvas({ projectId, designId, onClose }: DesignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [fillColor, setFillColor] = useState('#3b82f6');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showLayers, setShowLayers] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const textInputRef = useRef<HTMLInputElement>(null);
  const socket = getSocket();
  const { user } = useAuthStore();
  const [collaborators, setCollaborators] = useState<Array<{ userId: string; userName: string }>>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, { x: number; y: number; userName: string }>>(new Map());
  const currentDesignIdRef = useRef<string | undefined>(designId);

  // Join design room for collaboration
  useEffect(() => {
    if (!socket || !designId) return;

    currentDesignIdRef.current = designId;

    // Join design room
    socket.emit('design:join', { designId });

    // Listen for design events
    const handleShapeAdded = (data: { shape: Shape; userId: string; userName: string }) => {
      if (data.userId !== user?.id) {
        setShapes((prev) => [...prev, data.shape]);
      }
    };

    const handleShapeUpdated = (data: { shapeId: string; updates: any; userId: string }) => {
      if (data.userId !== user?.id) {
        setShapes((prev) =>
          prev.map((s) => (s.id === data.shapeId ? { ...s, ...data.updates } : s))
        );
      }
    };

    const handleShapeDeleted = (data: { shapeId: string; userId: string }) => {
      if (data.userId !== user?.id) {
        setShapes((prev) => prev.filter((s) => s.id !== data.shapeId));
      }
    };

    const handleDesignLoad = (data: { designData: string }) => {
      if (data.designData) {
        try {
          setShapes(JSON.parse(data.designData));
        } catch (e) {
          console.error('Failed to parse design data:', e);
        }
      }
    };

    const handleUserJoined = (data: { userId: string; userName: string }) => {
      setCollaborators((prev) => [...prev.filter((c) => c.userId !== data.userId), data]);
    };

    const handleCursorUpdated = (data: { userId: string; userName: string; x: number; y: number }) => {
      if (data.userId !== user?.id) {
        setRemoteCursors((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.userId, { x: data.x, y: data.y, userName: data.userName });
          return newMap;
        });
      }
    };

    socket.on('design:shape:added', handleShapeAdded);
    socket.on('design:shape:updated', handleShapeUpdated);
    socket.on('design:shape:deleted', handleShapeDeleted);
    socket.on('design:load', handleDesignLoad);
    socket.on('design:user:joined', handleUserJoined);
    socket.on('design:cursor:update', handleCursorUpdated);

    return () => {
      if (designId) {
        socket.emit('design:leave', { designId });
      }
      socket.off('design:shape:added', handleShapeAdded);
      socket.off('design:shape:updated', handleShapeUpdated);
      socket.off('design:shape:deleted', handleShapeDeleted);
      socket.off('design:load', handleDesignLoad);
      socket.off('design:user:joined', handleUserJoined);
      socket.off('design:cursor:update', handleCursorUpdated);
    };
  }, [socket, designId, user]);

  // Load design if designId provided
  useEffect(() => {
    if (designId) {
      loadDesign();
    }
  }, [designId]);

  // Save to history
  const saveToHistory = useCallback((newShapes: Shape[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newShapes]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      if (gridVisible) {
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        const gridSize = 20 * zoom;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
      }

      // Apply pan and zoom
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Draw shapes
      const sortedShapes = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
      sortedShapes.forEach((shape) => {
        ctx.fillStyle = shape.fill;
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = shape.strokeWidth;

        if (shape.id === selectedShape) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
        } else {
          ctx.setLineDash([]);
        }

        switch (shape.type) {
          case 'rectangle':
            ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            break;
          case 'circle':
            ctx.beginPath();
            ctx.arc(
              shape.x + shape.width / 2,
              shape.y + shape.height / 2,
              Math.min(shape.width, shape.height) / 2,
              0,
              Math.PI * 2
            );
            ctx.fill();
            ctx.stroke();
            break;
          case 'line':
            ctx.beginPath();
            ctx.moveTo(shape.x, shape.y);
            ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
            ctx.stroke();
            break;
          case 'text':
            ctx.font = `${shape.fontSize || 16}px ${shape.fontFamily || 'Arial'}`;
            ctx.fillStyle = shape.fill;
            ctx.fillText(shape.text || '', shape.x, shape.y + (shape.fontSize || 16));
            break;
        }

        ctx.setLineDash([]);
      });

      // Draw preview shape while drawing
      if (isDrawing && tool !== 'select' && tool !== 'pen') {
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.setLineDash([]);

        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(currentPos.x - startPos.x);
        const height = Math.abs(currentPos.y - startPos.y);

        switch (tool) {
          case 'rectangle':
            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);
            break;
          case 'circle':
            ctx.beginPath();
            const radius = Math.min(width, height) / 2;
            ctx.arc(x + width / 2, y + height / 2, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
          case 'line':
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke();
            break;
        }
      }

      // Draw remote cursors
      remoteCursors.forEach((cursor, userId) => {
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(cursor.userName, cursor.x + 8, cursor.y - 8);
        ctx.restore();
      });

      ctx.restore();
    };

    draw();
  }, [shapes, selectedShape, tool, isDrawing, startPos, currentPos, fillColor, strokeColor, strokeWidth, zoom, pan, gridVisible, remoteCursors]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasCoordinates(e);

    if (tool === 'select') {
      // Check if clicking on a shape
      const clickedShape = shapes.find((shape) => {
        if (shape.type === 'rectangle' || shape.type === 'circle') {
          return (
            pos.x >= shape.x &&
            pos.x <= shape.x + shape.width &&
            pos.y >= shape.y &&
            pos.y <= shape.y + shape.height
          );
        }
        return false;
      });

      if (clickedShape) {
        setSelectedShape(clickedShape.id);
      } else {
        setSelectedShape(null);
      }
    } else if (tool === 'text') {
      setShowTextInput(true);
      setStartPos(pos);
      if (textInputRef.current) {
        textInputRef.current.focus();
      }
    } else if (tool === 'pen') {
      setIsDrawing(true);
      setStartPos(pos);
      setCurrentPos(pos);
    } else {
      setIsDrawing(true);
      setStartPos(pos);
      setCurrentPos(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasCoordinates(e);
    setCurrentPos(pos);

    // Send cursor position for collaboration
    if (socket && designId && tool === 'select') {
      socket.emit('design:cursor:update', {
        designId,
        x: pos.x,
        y: pos.y,
      });
    }

    if (isDrawing && tool === 'pen') {
      // Draw freehand
      const newShape: Shape = {
        id: Date.now().toString(),
        type: 'line',
        x: startPos.x,
        y: startPos.y,
        width: pos.x - startPos.x,
        height: pos.y - startPos.y,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth,
        zIndex: shapes.length,
      };
      setShapes([...shapes, newShape]);
      setStartPos(pos);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && tool !== 'pen') {
      const newShape: Shape = {
        id: Date.now().toString(),
        type: tool === 'rectangle' ? 'rectangle' : tool === 'circle' ? 'circle' : 'line',
        x: Math.min(startPos.x, currentPos.x),
        y: Math.min(startPos.y, currentPos.y),
        width: Math.abs(currentPos.x - startPos.x),
        height: Math.abs(currentPos.y - startPos.y),
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth,
        zIndex: shapes.length,
      };

      if (newShape.width > 5 || newShape.height > 5) {
        const newShapes = [...shapes, newShape];
        setShapes(newShapes);
        saveToHistory(newShapes);

        // Broadcast to collaborators
        if (socket && designId) {
          socket.emit('design:shape:add', {
            designId,
            projectId,
            shape: newShape,
          });
        }
      }
    }

    setIsDrawing(false);
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      const newShape: Shape = {
        id: Date.now().toString(),
        type: 'text',
        x: startPos.x,
        y: startPos.y,
        width: 200,
        height: 30,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 0,
        text: textInput,
        fontSize: 16,
        fontFamily: 'Arial',
        zIndex: shapes.length,
      };
      const newShapes = [...shapes, newShape];
      setShapes(newShapes);
      saveToHistory(newShapes);
      
      // Broadcast to collaborators
      if (socket && designId) {
        socket.emit('design:shape:add', {
          designId,
          projectId,
          shape: newShape,
        });
      }
      
      setTextInput('');
      setShowTextInput(false);
    }
  };

  const deleteSelected = () => {
    if (selectedShape) {
      const newShapes = shapes.filter((s) => s.id !== selectedShape);
      setShapes(newShapes);
      saveToHistory(newShapes);
      
      // Broadcast deletion
      if (socket && designId) {
        socket.emit('design:shape:delete', {
          designId,
          shapeId: selectedShape,
        });
      }
      
      setSelectedShape(null);
    }
  };

  const duplicateSelected = () => {
    if (selectedShape) {
      const shape = shapes.find((s) => s.id === selectedShape);
      if (shape) {
        const newShape: Shape = {
          ...shape,
          id: Date.now().toString(),
          x: shape.x + 20,
          y: shape.y + 20,
          zIndex: shapes.length,
        };
        const newShapes = [...shapes, newShape];
        setShapes(newShapes);
        saveToHistory(newShapes);
      }
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setShapes([...history[newIndex]]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setShapes([...history[newIndex]]);
    }
  };

  const saveDesign = async () => {
    try {
      // Generate thumbnail from canvas
      const canvas = canvasRef.current;
      let thumbnail: string | undefined;
      if (canvas) {
        thumbnail = canvas.toDataURL('image/png', 0.1);
      }

      const designData = {
        projectId,
        name: designId ? undefined : `Design ${new Date().toLocaleString()}`,
        data: JSON.stringify(shapes),
        thumbnail,
      };

      if (designId) {
        await api.put(`/designs/${designId}`, designData);
        toast.success('Design updated');
      } else {
        const response = await api.post('/designs', designData);
        toast.success('Design saved');
        // Reload page to show new design in list
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to save design');
    }
  };

  const loadDesign = async () => {
    try {
      const response = await api.get(`/designs/${designId}`);
      const design = response.data.data.design;
      if (design.data) {
        setShapes(JSON.parse(design.data));
      }
    } catch (error) {
      console.error('Failed to load design:', error);
    }
  };

  const exportAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `design-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          {collaborators.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-lg border border-gray-600">
              <Users className="w-4 h-4 text-collab-400" />
              <span className="text-sm text-gray-300 font-medium">{collaborators.length}</span>
              <div className="flex -space-x-2">
                {collaborators.slice(0, 3).map((collab) => (
                  <div
                    key={collab.userId}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-collab-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold border-2 border-gray-800"
                    title={collab.userName}
                  >
                    {collab.userName[0].toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTool('select')}
              className={`p-2 rounded ${tool === 'select' ? 'bg-collab-500' : 'bg-gray-700'} text-white hover:bg-gray-600 transition-colors`}
              title="Select"
            >
              <Move className="w-5 h-5" />
            </button>
          <button
            onClick={() => setTool('rectangle')}
            className={`p-2 rounded ${tool === 'rectangle' ? 'bg-collab-500' : 'bg-gray-700'} text-white`}
            title="Rectangle"
          >
            <Square className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded ${tool === 'circle' ? 'bg-collab-500' : 'bg-gray-700'} text-white`}
            title="Circle"
          >
            <Circle className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('line')}
            className={`p-2 rounded ${tool === 'line' ? 'bg-collab-500' : 'bg-gray-700'} text-white`}
            title="Line"
          >
            <Minus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('text')}
            className={`p-2 rounded ${tool === 'text' ? 'bg-collab-500' : 'bg-gray-700'} text-white`}
            title="Text"
          >
            <Type className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded ${tool === 'pen' ? 'bg-collab-500' : 'bg-gray-700'} text-white`}
            title="Pen"
          >
            <PenTool className="w-5 h-5" />
          </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            className="p-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            className="p-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
          <button
            onClick={() => setGridVisible(!gridVisible)}
            className={`p-2 rounded ${gridVisible ? 'bg-collab-500' : 'bg-gray-700'} text-white`}
            title="Toggle Grid"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`p-2 rounded ${showLayers ? 'bg-collab-500' : 'bg-gray-700'} text-white`}
            title="Layers"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={saveDesign}
            className="p-2 rounded bg-green-600 text-white hover:bg-green-700"
            title="Save"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={exportAsImage}
            className="p-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded bg-red-600 text-white hover:bg-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          {/* Color Picker */}
          <div className="mb-4">
            <label className="text-sm text-gray-300 mb-2 block">Fill Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-gray-300 mb-2 block">Stroke Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-gray-300 mb-2 block">Stroke Width</label>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-gray-400">{strokeWidth}px</span>
          </div>

          {/* Zoom Controls */}
          <div className="mb-4">
            <label className="text-sm text-gray-300 mb-2 block">Zoom</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
                className="p-1 rounded bg-gray-700 text-white"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm text-white flex-1 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                className="p-1 rounded bg-gray-700 text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Selected Shape Actions */}
          {selectedShape && (
            <div className="border-t border-gray-700 pt-4 mt-4">
              <div className="flex gap-2">
                <button
                  onClick={duplicateSelected}
                  className="flex-1 p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  <Copy className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={deleteSelected}
                  className="flex-1 p-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>
          )}

          {/* Layers Panel */}
          {showLayers && (
            <div className="border-t border-gray-700 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Layers</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {[...shapes].reverse().map((shape) => (
                  <div
                    key={shape.id}
                    onClick={() => setSelectedShape(shape.id)}
                    className={`p-2 rounded cursor-pointer ${
                      selectedShape === shape.id ? 'bg-collab-500' : 'bg-gray-700'
                    } text-white text-sm`}
                  >
                    {shape.type} {shape.id.slice(-4)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="absolute inset-0 cursor-crosshair"
          />
          {showTextInput && (
            <input
              ref={textInputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onBlur={handleTextSubmit}
              onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
              style={{
                position: 'absolute',
                left: `${startPos.x * zoom + pan.x}px`,
                top: `${startPos.y * zoom + pan.y}px`,
                fontSize: `${16 * zoom}px`,
              }}
              className="px-2 py-1 border-2 border-blue-500 rounded outline-none bg-white"
              autoFocus
            />
          )}
        </div>
      </div>
    </div>
  );
}

