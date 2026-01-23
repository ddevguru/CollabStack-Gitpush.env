import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Square, Circle, Type, Move, PenTool, Layers, Save, Download,
  Trash2, Copy, Undo, Redo, Minus, Plus, Grid, Lock, Users, X,
  AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  Group, Ungroup, RotateCw, FlipHorizontal, FlipVertical, Maximize2,
  Image as ImageIcon, FileText, FileDown, Eye, EyeOff, CornerDownRight
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
  type: 'rectangle' | 'circle' | 'line' | 'text' | 'polygon' | 'star' | 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity?: number;
  borderRadius?: number;
  rotation?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  locked?: boolean;
  visible?: boolean;
  groupId?: string;
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
  const [opacity, setOpacity] = useState(100);
  const [borderRadius, setBorderRadius] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showLayers, setShowLayers] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [selectedShapes, setSelectedShapes] = useState<string[]>([]);
  const [groups, setGroups] = useState<Map<string, string[]>>(new Map());
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

        // Apply opacity
        ctx.globalAlpha = shape.opacity !== undefined ? shape.opacity : 1;
        
        // Skip if not visible
        if (shape.visible === false) {
          ctx.globalAlpha = 1;
          ctx.restore();
          return;
        }

        switch (shape.type) {
          case 'rectangle':
            if (shape.borderRadius && shape.borderRadius > 0) {
              // Rounded rectangle
              const r = Math.min(shape.borderRadius, shape.width / 2, shape.height / 2);
              ctx.beginPath();
              ctx.moveTo(shape.x + r, shape.y);
              ctx.lineTo(shape.x + shape.width - r, shape.y);
              ctx.quadraticCurveTo(shape.x + shape.width, shape.y, shape.x + shape.width, shape.y + r);
              ctx.lineTo(shape.x + shape.width, shape.y + shape.height - r);
              ctx.quadraticCurveTo(shape.x + shape.width, shape.y + shape.height, shape.x + shape.width - r, shape.y + shape.height);
              ctx.lineTo(shape.x + r, shape.y + shape.height);
              ctx.quadraticCurveTo(shape.x, shape.y + shape.height, shape.x, shape.y + shape.height - r);
              ctx.lineTo(shape.x, shape.y + r);
              ctx.quadraticCurveTo(shape.x, shape.y, shape.x + r, shape.y);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            } else {
              ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
              ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            }
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
            ctx.font = `${shape.fontStyle === 'italic' ? 'italic ' : ''}${shape.fontWeight === 'bold' ? 'bold ' : ''}${shape.fontSize || 16}px ${shape.fontFamily || 'Arial'}`;
            ctx.fillStyle = shape.fill;
            ctx.textAlign = (shape.textAlign || 'left') as CanvasTextAlign;
            ctx.fillText(shape.text || '', shape.x, shape.y + (shape.fontSize || 16));
            break;
        }
        
        ctx.globalAlpha = 1;

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
      let x = Math.min(startPos.x, currentPos.x);
      let y = Math.min(startPos.y, currentPos.y);
      let width = Math.abs(currentPos.x - startPos.x);
      let height = Math.abs(currentPos.y - startPos.y);

      // Snap to grid
      if (snapToGrid) {
        const gridSize = 10;
        x = Math.round(x / gridSize) * gridSize;
        y = Math.round(y / gridSize) * gridSize;
        width = Math.round(width / gridSize) * gridSize;
        height = Math.round(height / gridSize) * gridSize;
      }

      const newShape: Shape = {
        id: Date.now().toString(),
        type: tool === 'rectangle' ? 'rectangle' : tool === 'circle' ? 'circle' : 'line',
        x,
        y,
        width: Math.max(width, 10),
        height: Math.max(height, 10),
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth,
        opacity: opacity / 100,
        borderRadius: tool === 'rectangle' ? borderRadius : 0,
        visible: true,
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
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        opacity: opacity / 100,
        visible: true,
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

  const exportAsImage = (format: 'png' | 'jpg' | 'svg' = 'png') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (format === 'svg') {
      // Export as SVG
      let svg = `<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">`;
      shapes.forEach((shape) => {
        if (shape.visible === false) return;
        switch (shape.type) {
          case 'rectangle':
            svg += `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" rx="${shape.borderRadius || 0}" opacity="${shape.opacity || 1}"/>`;
            break;
          case 'circle':
            svg += `<circle cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" r="${Math.min(shape.width, shape.height) / 2}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" opacity="${shape.opacity || 1}"/>`;
            break;
          case 'line':
            svg += `<line x1="${shape.x}" y1="${shape.y}" x2="${shape.x + shape.width}" y2="${shape.y + shape.height}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" opacity="${shape.opacity || 1}"/>`;
            break;
          case 'text':
            svg += `<text x="${shape.x}" y="${shape.y + (shape.fontSize || 16)}" fill="${shape.fill}" font-size="${shape.fontSize || 16}" font-family="${shape.fontFamily || 'Arial'}" font-weight="${shape.fontWeight || 'normal'}" font-style="${shape.fontStyle || 'normal'}" text-anchor="${shape.textAlign || 'left'}" opacity="${shape.opacity || 1}">${(shape.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`;
            break;
        }
      });
      svg += '</svg>';
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `design-${Date.now()}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const link = document.createElement('a');
      link.download = `design-${Date.now()}.${format}`;
      link.href = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : format}`, 0.95);
      link.click();
    }
  };

  // Align functions
  const alignShapes = (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedShape) return;
    
    const shape = shapes.find(s => s.id === selectedShape);
    if (!shape) return;
    
    // Align to canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const updates: Partial<Shape> = {};
    switch (direction) {
      case 'left': updates.x = 0; break;
      case 'center': updates.x = (canvas.width / zoom - shape.width) / 2; break;
      case 'right': updates.x = canvas.width / zoom - shape.width; break;
      case 'top': updates.y = 0; break;
      case 'middle': updates.y = (canvas.height / zoom - shape.height) / 2; break;
      case 'bottom': updates.y = canvas.height / zoom - shape.height; break;
    }
    
    const newShapes = shapes.map(s => s.id === selectedShape ? { ...s, ...updates } : s);
    setShapes(newShapes);
    saveToHistory(newShapes);
    
    // Broadcast update
    if (socket && designId) {
      socket.emit('design:shape:update', {
        designId,
        shapeId: selectedShape,
        updates,
      });
    }
  };

  const updateSelectedShape = (updates: Partial<Shape>) => {
    if (!selectedShape) return;
    const newShapes = shapes.map(s => s.id === selectedShape ? { ...s, ...updates } : s);
    setShapes(newShapes);
    saveToHistory(newShapes);
    
    // Broadcast update
    if (socket && designId) {
      socket.emit('design:shape:update', {
        designId,
        shapeId: selectedShape,
        updates,
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white">
      {/* Top Toolbar - Figma Style */}
      <div className="h-12 bg-[#2c2c2c] border-b border-[#3a3a3a] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Collaborators */}
          {collaborators.length > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 bg-[#363636] rounded-md border border-[#4a4a4a]">
              <Users className="w-3.5 h-3.5 text-collab-400" />
              <span className="text-xs font-medium text-gray-300">{collaborators.length}</span>
              <div className="flex -space-x-1.5">
                {collaborators.slice(0, 3).map((collab) => (
                  <div
                    key={collab.userId}
                    className="w-5 h-5 rounded-full bg-gradient-to-br from-collab-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-semibold border-2 border-[#2c2c2c]"
                    title={collab.userName}
                  >
                    {collab.userName[0].toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Tool Separator */}
          <div className="w-px h-6 bg-[#3a3a3a] mx-1" />
          
          {/* Tools */}
          <div className="flex items-center gap-1 bg-[#363636] rounded-md p-1">
            <button
              onClick={() => setTool('select')}
              className={`p-1.5 rounded ${tool === 'select' ? 'bg-[#4a4a4a] text-white' : 'text-gray-400 hover:text-white hover:bg-[#404040]'} transition-all`}
              title="Select (V)"
            >
              <Move className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('rectangle')}
              className={`p-1.5 rounded ${tool === 'rectangle' ? 'bg-[#4a4a4a] text-white' : 'text-gray-400 hover:text-white hover:bg-[#404040]'} transition-all`}
              title="Rectangle (R)"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('circle')}
              className={`p-1.5 rounded ${tool === 'circle' ? 'bg-[#4a4a4a] text-white' : 'text-gray-400 hover:text-white hover:bg-[#404040]'} transition-all`}
              title="Circle (O)"
            >
              <Circle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('line')}
              className={`p-1.5 rounded ${tool === 'line' ? 'bg-[#4a4a4a] text-white' : 'text-gray-400 hover:text-white hover:bg-[#404040]'} transition-all`}
              title="Line (L)"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('text')}
              className={`p-1.5 rounded ${tool === 'text' ? 'bg-[#4a4a4a] text-white' : 'text-gray-400 hover:text-white hover:bg-[#404040]'} transition-all`}
              title="Text (T)"
            >
              <Type className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('pen')}
              className={`p-1.5 rounded ${tool === 'pen' ? 'bg-[#4a4a4a] text-white' : 'text-gray-400 hover:text-white hover:bg-[#404040]'} transition-all`}
              title="Pen (P)"
            >
              <PenTool className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#363636] rounded-md p-1">
            <button
              onClick={undo}
              disabled={historyIndex < 0}
              className={`p-1.5 rounded ${historyIndex >= 0 ? 'text-gray-400 hover:text-white hover:bg-[#404040]' : 'text-gray-600 cursor-not-allowed'} transition-all`}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className={`p-1.5 rounded ${historyIndex < history.length - 1 ? 'text-gray-400 hover:text-white hover:bg-[#404040]' : 'text-gray-600 cursor-not-allowed'} transition-all`}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-px h-6 bg-[#3a3a3a] mx-1" />
          
          {/* Align Tools */}
          {selectedShape && (
            <>
              <div className="flex items-center gap-0.5 bg-[#363636] rounded-md p-1">
                <button
                  onClick={() => alignShapes('left')}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#404040] transition-all"
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alignShapes('center')}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#404040] transition-all"
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alignShapes('right')}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#404040] transition-all"
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-[#3a3a3a] mx-0.5" />
                <button
                  onClick={() => alignShapes('top')}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#404040] transition-all"
                  title="Align Top"
                >
                  <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alignShapes('middle')}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#404040] transition-all"
                  title="Align Middle"
                >
                  <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alignShapes('bottom')}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#404040] transition-all"
                  title="Align Bottom"
                >
                  <AlignVerticalJustifyEnd className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="w-px h-6 bg-[#3a3a3a] mx-1" />
            </>
          )}
          
          {/* Snap to Grid Toggle */}
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-1.5 rounded ${snapToGrid ? 'bg-[#4a4a4a] text-collab-400' : 'text-gray-400 hover:text-white hover:bg-[#404040]'} transition-all`}
            title="Snap to Grid"
          >
            <CornerDownRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setGridVisible(!gridVisible)}
            className={`p-1.5 rounded ${gridVisible ? 'bg-[#4a4a4a] text-collab-400' : 'text-gray-400 hover:text-white hover:bg-[#404040]'} transition-all`}
            title="Toggle Grid"
          >
            <Grid className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`p-1.5 rounded ${showLayers ? 'bg-[#4a4a4a] text-collab-400' : 'text-gray-400 hover:text-white hover:bg-[#404040]'} transition-all`}
            title="Layers Panel"
          >
            <Layers className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-[#3a3a3a] mx-1" />
          
          <button
            onClick={saveDesign}
            className="px-3 py-1.5 bg-collab-500 hover:bg-collab-600 text-white rounded-md text-sm font-medium transition-all flex items-center gap-1.5"
            title="Save Design"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
          
          {/* Export Dropdown */}
          <div className="relative group">
            <button
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#404040] transition-all"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-[#363636] border border-[#4a4a4a] rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[120px]">
              <button
                onClick={() => exportAsImage('png')}
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#404040] flex items-center gap-2"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                PNG
              </button>
              <button
                onClick={() => exportAsImage('jpg')}
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#404040] flex items-center gap-2"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                JPG
              </button>
              <button
                onClick={() => exportAsImage('svg')}
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#404040] flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5" />
                SVG
              </button>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#404040] transition-all ml-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Properties Panel */}
        <div className="w-64 bg-[#252525] border-r border-[#3a3a3a] flex flex-col flex-shrink-0">
          {/* Properties Header */}
          <div className="h-10 border-b border-[#3a3a3a] flex items-center px-4 bg-[#2c2c2c]">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Properties</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
          {/* Fill Color */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-400 mb-2 block uppercase tracking-wider">Fill</label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-2 border-[#3a3a3a]"
                />
              </div>
              <input
                type="text"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#363636] border border-[#3a3a3a] text-white rounded text-sm focus:outline-none focus:border-collab-500"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Stroke */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-400 mb-2 block uppercase tracking-wider">Stroke</label>
            <div className="flex items-center gap-2 mb-2">
              <div className="relative">
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-2 border-[#3a3a3a]"
                />
              </div>
              <input
                type="text"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#363636] border border-[#3a3a3a] text-white rounded text-sm focus:outline-none focus:border-collab-500"
                placeholder="#000000"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="20"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="flex-1 h-1.5 bg-[#363636] rounded-lg appearance-none cursor-pointer accent-collab-500"
              />
              <span className="text-xs text-gray-400 w-12 text-right">{strokeWidth}px</span>
            </div>
          </div>

          {/* Opacity */}
          {selectedShape && (
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-400 mb-2 block uppercase tracking-wider">Opacity</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={shapes.find(s => s.id === selectedShape)?.opacity ? Math.round((shapes.find(s => s.id === selectedShape)?.opacity || 1) * 100) : opacity}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setOpacity(val);
                    updateSelectedShape({ opacity: val / 100 });
                  }}
                  className="flex-1 h-1.5 bg-[#363636] rounded-lg appearance-none cursor-pointer accent-collab-500"
                />
                <span className="text-xs text-gray-400 w-12 text-right">{Math.round((shapes.find(s => s.id === selectedShape)?.opacity || 1) * 100)}%</span>
              </div>
            </div>
          )}

          {/* Border Radius (for rectangles) */}
          {selectedShape && shapes.find(s => s.id === selectedShape)?.type === 'rectangle' && (
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-400 mb-2 block uppercase tracking-wider">Border Radius</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={shapes.find(s => s.id === selectedShape)?.borderRadius || borderRadius}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBorderRadius(val);
                    updateSelectedShape({ borderRadius: val });
                  }}
                  className="flex-1 h-1.5 bg-[#363636] rounded-lg appearance-none cursor-pointer accent-collab-500"
                />
                <span className="text-xs text-gray-400 w-12 text-right">{shapes.find(s => s.id === selectedShape)?.borderRadius || 0}px</span>
              </div>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="mb-4 pb-4 border-b border-[#3a3a3a]">
            <label className="text-xs font-medium text-gray-400 mb-2 block uppercase tracking-wider">Zoom</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
                className="p-1.5 rounded bg-[#363636] hover:bg-[#404040] text-gray-400 hover:text-white transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="text"
                value={`${Math.round(zoom * 100)}%`}
                readOnly
                className="flex-1 px-3 py-1.5 bg-[#363636] border border-[#3a3a3a] text-white rounded text-sm text-center"
              />
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                className="p-1.5 rounded bg-[#363636] hover:bg-[#404040] text-gray-400 hover:text-white transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="px-2 py-1 text-xs bg-[#363636] hover:bg-[#404040] text-gray-400 hover:text-white rounded transition-all"
                title="Reset Zoom"
              >
                100%
              </button>
            </div>
          </div>

          {/* Selected Shape Actions */}
          {selectedShape && (
            <div className="pt-4 mt-4 border-t border-[#3a3a3a] space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={duplicateSelected}
                  className="flex-1 px-3 py-2 bg-[#363636] hover:bg-[#404040] text-gray-300 hover:text-white rounded text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                  title="Duplicate (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={() => {
                    const shape = shapes.find(s => s.id === selectedShape);
                    if (shape) {
                      updateSelectedShape({ locked: !shape.locked });
                    }
                  }}
                  className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                    shapes.find(s => s.id === selectedShape)?.locked
                      ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                      : 'bg-[#363636] hover:bg-[#404040] text-gray-300 hover:text-white'
                  }`}
                  title="Lock/Unlock"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    const shape = shapes.find(s => s.id === selectedShape);
                    if (shape) {
                      updateSelectedShape({ visible: shape.visible === false });
                    }
                  }}
                  className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                    shapes.find(s => s.id === selectedShape)?.visible === false
                      ? 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                      : 'bg-[#363636] hover:bg-[#404040] text-gray-300 hover:text-white'
                  }`}
                  title="Show/Hide"
                >
                  {shapes.find(s => s.id === selectedShape)?.visible === false ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={deleteSelected}
                  className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded text-sm font-medium transition-all"
                  title="Delete (Delete)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {/* Text Formatting (for text shapes) */}
              {shapes.find(s => s.id === selectedShape)?.type === 'text' && (
                <div className="flex gap-1 pt-2 border-t border-[#3a3a3a]">
                  <button
                    onClick={() => {
                      const shape = shapes.find(s => s.id === selectedShape);
                      if (shape) {
                        updateSelectedShape({ fontWeight: shape.fontWeight === 'bold' ? 'normal' : 'bold' });
                      }
                    }}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                      shapes.find(s => s.id === selectedShape)?.fontWeight === 'bold'
                        ? 'bg-collab-500/20 text-collab-400'
                        : 'bg-[#363636] hover:bg-[#404040] text-gray-300'
                    }`}
                    title="Bold"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    onClick={() => {
                      const shape = shapes.find(s => s.id === selectedShape);
                      if (shape) {
                        updateSelectedShape({ fontStyle: shape.fontStyle === 'italic' ? 'normal' : 'italic' });
                      }
                    }}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                      shapes.find(s => s.id === selectedShape)?.fontStyle === 'italic'
                        ? 'bg-collab-500/20 text-collab-400'
                        : 'bg-[#363636] hover:bg-[#404040] text-gray-300'
                    }`}
                    title="Italic"
                  >
                    <em>I</em>
                  </button>
                  <div className="flex-1" />
                  <select
                    value={shapes.find(s => s.id === selectedShape)?.textAlign || 'left'}
                    onChange={(e) => updateSelectedShape({ textAlign: e.target.value as 'left' | 'center' | 'right' })}
                    className="px-2 py-1.5 bg-[#363636] border border-[#3a3a3a] text-white rounded text-xs"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Layers Panel - Right Side */}
        {showLayers && (
          <div className="w-64 bg-[#252525] border-l border-[#3a3a3a] flex flex-col flex-shrink-0">
            <div className="h-10 border-b border-[#3a3a3a] flex items-center justify-between px-4 bg-[#2c2c2c]">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Layers</span>
              <span className="text-xs text-gray-500">{shapes.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {shapes.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No layers yet
                </div>
              ) : (
                <div className="space-y-0.5">
                  {[...shapes].reverse().map((shape, index) => (
                    <div
                      key={shape.id}
                      onClick={() => setSelectedShape(shape.id)}
                      className={`px-3 py-2 rounded cursor-pointer transition-all flex items-center gap-2 ${
                        selectedShape === shape.id 
                          ? 'bg-collab-500/20 border border-collab-500/50' 
                          : 'hover:bg-[#363636]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 ${
                        shape.type === 'rectangle' ? 'border-white' :
                        shape.type === 'circle' ? 'rounded-full border-white' :
                        'border-dashed border-white'
                      }`} style={{ backgroundColor: shape.fill }} />
                      <span className="text-sm text-gray-300 flex-1 capitalize">
                        {shape.type} {shapes.length - index}
                      </span>
                      {shape.locked && (
                        <Lock className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Canvas - Figma Style */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#f5f5f5]">
          {/* Canvas Background Pattern */}
          {gridVisible && (
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #e0e0e0 1px, transparent 1px),
                  linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
              }}
            />
          )}
          
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="absolute inset-0"
            style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
          />
          
          {/* Zoom Indicator */}
          <div className="absolute bottom-4 right-4 bg-[#2c2c2c]/90 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs text-gray-300 border border-[#3a3a3a]">
            {Math.round(zoom * 100)}%
          </div>
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

