"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Lock, Unlock, Plus, X, Edit3, Link, Unlink, Move } from 'lucide-react';
import KanbanBoard from './kanban-board';

interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  color?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

interface CanvasElementProps {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'frame' | 'line' | 'arrow' | 'pen' | 'kanban';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  strokeWidth?: number;
  points?: { x: number; y: number }[];
  rotation?: number;
  locked?: boolean;
  connected?: string[]; // Array of connected element IDs
  kanbanData?: {
    columns: KanbanColumn[];
  };
  onUpdate?: (id: string, updates: Partial<CanvasElementProps>) => void;
  onSelect?: (id: string) => void;
  onConnect?: (fromId: string, toId: string) => void;
  onDisconnect?: (fromId: string, toId: string) => void;
  isSelected?: boolean;
  zoom?: number;
  allElements?: CanvasElementProps[]; // For connection visualization
}

export default function CanvasElement({
  id,
  type,
  x,
  y,
  width = 100,
  height = 100,
  content = '',
  color = '#6366f1',
  strokeWidth = 2,
  points = [],
  rotation = 0,
  locked = false,
  connected = [],
  kanbanData,
  onUpdate,
  onSelect,
  onConnect,
  onDisconnect,
  isSelected = false,
  zoom = 100,
  allElements = []
}: CanvasElementProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showConnectionMode, setShowConnectionMode] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (locked) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - x,
      y: e.clientY - y
    });
    onSelect?.(id);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    if (locked) return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    onSelect?.(id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (locked) return;
    e.stopPropagation();
    if (type === 'text' || type === 'sticky') {
      setIsEditing(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && onUpdate && !locked) {
      onUpdate(id, {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    } else if (isResizing && onUpdate && !locked) {
      const rect = elementRef.current?.getBoundingClientRect();
      if (!rect) return;

      const deltaX = e.clientX - rect.left;
      const deltaY = e.clientY - rect.top;

      let newWidth = width;
      let newHeight = height;
      let newX = x;
      let newY = y;

      switch (resizeHandle) {
        case 'nw':
          newWidth = Math.max(50, width - deltaX);
          newHeight = Math.max(50, height - deltaY);
          newX = x + (width - newWidth);
          newY = y + (height - newHeight);
          break;
        case 'ne':
          newWidth = Math.max(50, deltaX);
          newHeight = Math.max(50, height - deltaY);
          newY = y + (height - newHeight);
          break;
        case 'sw':
          newWidth = Math.max(50, width - deltaX);
          newHeight = Math.max(50, deltaY);
          newX = x + (width - newWidth);
          break;
        case 'se':
          newWidth = Math.max(50, deltaX);
          newHeight = Math.max(50, deltaY);
          break;
        case 'n':
          newHeight = Math.max(50, height - deltaY);
          newY = y + (height - newHeight);
          break;
        case 's':
          newHeight = Math.max(50, deltaY);
          break;
        case 'w':
          newWidth = Math.max(50, width - deltaX);
          newX = x + (width - newWidth);
          break;
        case 'e':
          newWidth = Math.max(50, deltaX);
          break;
      }

      onUpdate(id, { width: newWidth, height: newHeight, x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle('');
  };

  const handleContentChange = (newContent: string) => {
    onUpdate?.(id, { content: newContent });
  };

  const handleLockToggle = () => {
    onUpdate?.(id, { locked: !locked });
  };

  const handleConnect = (targetId: string) => {
    if (connected.includes(targetId)) {
      onDisconnect?.(id, targetId);
    } else {
      onConnect?.(id, targetId);
    }
    setShowConnectionMode(false);
  };

  // Add event listeners when dragging or resizing
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeHandle]);

  // Render connection lines
  const renderConnections = () => {
    if (!connected.length || !allElements.length) return null;

    return connected.map(connectedId => {
      const connectedElement = allElements.find(el => el.id === connectedId);
      if (!connectedElement) return null;

      const startX = x + (width / 2);
      const startY = y + (height / 2);
      const endX = connectedElement.x + (connectedElement.width || 100) / 2;
      const endY = connectedElement.y + (connectedElement.height || 100) / 2;

      const svgWidth = Math.abs(endX - startX) + 40;
      const svgHeight = Math.abs(endY - startY) + 40;
      const svgX = Math.min(startX, endX) - 20;
      const svgY = Math.min(startY, endY) - 20;

      const lineStartX = startX - svgX;
      const lineStartY = startY - svgY;
      const lineEndX = endX - svgX;
      const lineEndY = endY - svgY;

      return (
        <motion.svg
          key={connectedId}
          className="absolute pointer-events-none"
          style={{
            left: svgX,
            top: svgY,
            width: svgWidth,
            height: svgHeight,
            zIndex: -1
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <defs>
            <marker
              id={`arrowhead-${id}-${connectedId}`}
              markerWidth="12"
              markerHeight="8"
              refX="11"
              refY="4"
              orient="auto"
            >
              <polygon
                points="0 0, 12 4, 0 8"
                fill="#6366f1"
              />
            </marker>
          </defs>
          <motion.line
            x1={lineStartX}
            y1={lineStartY}
            x2={lineEndX}
            y2={lineEndY}
            stroke="#6366f1"
            strokeWidth="3"
            strokeDasharray="8,4"
            markerEnd={`url(#arrowhead-${id}-${connectedId})`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
          {/* Connection label */}
          <motion.text
            x={(lineStartX + lineEndX) / 2}
            y={(lineStartY + lineEndY) / 2 - 5}
            fill="#6366f1"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
            className="pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Connected
          </motion.text>
        </motion.svg>
      );
    });
  };

  // Render resize handles
  const renderResizeHandles = () => {
    if (!isSelected || locked || type === 'line' || type === 'arrow' || type === 'pen') return null;

    const handles = [
      { id: 'nw', className: 'cursor-nw-resize', style: { top: -6, left: -6 } },
      { id: 'ne', className: 'cursor-ne-resize', style: { top: -6, right: -6 } },
      { id: 'sw', className: 'cursor-sw-resize', style: { bottom: -6, left: -6 } },
      { id: 'se', className: 'cursor-se-resize', style: { bottom: -6, right: -6 } },
      { id: 'n', className: 'cursor-n-resize', style: { top: -6, left: '50%', transform: 'translateX(-50%)' } },
      { id: 's', className: 'cursor-s-resize', style: { bottom: -6, left: '50%', transform: 'translateX(-50%)' } },
      { id: 'w', className: 'cursor-w-resize', style: { top: '50%', left: -6, transform: 'translateY(-50%)' } },
      { id: 'e', className: 'cursor-e-resize', style: { top: '50%', right: -6, transform: 'translateY(-50%)' } },
    ];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
      >
        {handles.map(handle => (
          <div
            key={handle.id}
            className={`absolute w-3 h-3 bg-indigo-500 border-2 border-white rounded-full shadow-lg hover:bg-indigo-600 transition-colors ${handle.className}`}
            style={handle.style}
            onMouseDown={(e) => handleResizeMouseDown(e, handle.id)}
          />
        ))}
      </motion.div>
    );
  };

  const renderKanbanBoard = () => {
    if (!kanbanData) return null;

    return (
      <motion.div
        ref={elementRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: isSelected ? 1 : 1.005 }}
        className={`absolute bg-white rounded-2xl shadow-xl border-2 transition-all duration-300 overflow-hidden ${
          isSelected ? 'border-indigo-400 ring-4 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
        } ${locked ? 'opacity-75' : ''}`}
        style={{
          left: x,
          top: y,
          width,
          height,
          transform: `rotate(${rotation}deg)`
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Connection indicators */}
        {connected.length > 0 && (
          <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg z-10">
            {connected.length}
          </div>
        )}

        {/* Kanban Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">K</span>
            </div>
            <h3 className="font-semibold text-slate-900">Kanban Board</h3>
          </div>
          {!locked && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
                {kanbanData.columns.reduce((total, col) => total + col.cards.length, 0)} tasks
              </span>
            </div>
          )}
        </div>

        {/* Kanban Content */}
        <div className="h-full overflow-hidden">
          <KanbanBoard
            data={kanbanData}
            onUpdate={(newKanbanData) => onUpdate?.(id, { kanbanData: newKanbanData })}
            locked={locked}
          />
        </div>

        {renderResizeHandles()}
        {renderConnections()}
      </motion.div>
    );
  };

  const renderElement = () => {
    const baseClasses = `absolute transition-all duration-300 ${
      isSelected ? 'ring-4 ring-indigo-200' : ''
    } ${locked ? 'opacity-75' : ''}`;

    const transform = `rotate(${rotation}deg)`;

    if (type === 'kanban') {
      return renderKanbanBoard();
    }

    switch (type) {
      case 'frame':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: isSelected ? 1 : 1.02 }}
            className={`${baseClasses} border-2 border-dashed border-purple-400 bg-purple-50/30 rounded-xl cursor-move hover:border-purple-500 hover:bg-purple-50/50 shadow-lg`}
            style={{
              left: x,
              top: y,
              width,
              height,
              transform,
              borderColor: color
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Connection indicators */}
            {connected.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg z-10">
                {connected.length}
              </div>
            )}

            <div className="absolute -top-8 left-0 text-sm text-purple-600 font-semibold bg-white px-3 py-1 rounded-lg shadow-sm border border-purple-200">
              Frame
            </div>
            {renderResizeHandles()}
            {renderConnections()}
          </motion.div>
        );

      case 'rectangle':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: isSelected ? 1 : 1.02 }}
            className={`${baseClasses} border-2 rounded-xl cursor-move hover:shadow-xl transition-all duration-300`}
            style={{
              left: x,
              top: y,
              width,
              height,
              transform,
              backgroundColor: color + '20',
              borderColor: color,
              boxShadow: `0 4px 20px ${color}20`
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Connection indicators */}
            {connected.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg z-10">
                {connected.length}
              </div>
            )}

            {renderResizeHandles()}
            {renderConnections()}
          </motion.div>
        );

      case 'circle':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: isSelected ? 1 : 1.02 }}
            className={`${baseClasses} border-2 rounded-full cursor-move hover:shadow-xl transition-all duration-300`}
            style={{
              left: x,
              top: y,
              width,
              height,
              transform,
              backgroundColor: color + '20',
              borderColor: color,
              boxShadow: `0 4px 20px ${color}20`
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Connection indicators */}
            {connected.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg z-10">
                {connected.length}
              </div>
            )}

            {renderResizeHandles()}
            {renderConnections()}
          </motion.div>
        );

      case 'text':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: isSelected ? 1 : 1.02 }}
            className={`${baseClasses} cursor-move min-w-[100px] min-h-[40px] ${
              isEditing ? 'border-2 border-indigo-400 bg-white shadow-lg' : 'border-2 border-transparent hover:border-slate-300 hover:bg-white/80 hover:shadow-md'
            } rounded-xl transition-all duration-300`}
            style={{
              left: x,
              top: y,
              width: width === 100 ? 'auto' : width,
              height: height === 100 ? 'auto' : height,
              transform
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Connection indicators */}
            {connected.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg z-10">
                {connected.length}
              </div>
            )}

            {isEditing ? (
              <textarea
                className="w-full h-full outline-none resize-none bg-transparent text-slate-900 font-medium p-4 rounded-xl"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                autoFocus
              />
            ) : (
              <div className="p-4 text-slate-900 font-medium whitespace-pre-wrap">
                {content || 'Double-click to edit'}
              </div>
            )}
            {renderResizeHandles()}
            {renderConnections()}
          </motion.div>
        );

      case 'sticky':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: isSelected ? 1 : 1.02, rotate: 1 }}
            className={`${baseClasses} rounded-xl shadow-xl cursor-move hover:shadow-2xl transition-all duration-300`}
            style={{
              left: x,
              top: y,
              width,
              height,
              transform,
              backgroundColor: color || '#fbbf24',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Connection indicators */}
            {connected.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg z-10">
                {connected.length}
              </div>
            )}

            {isEditing ? (
              <textarea
                className="w-full h-full p-4 outline-none resize-none bg-transparent text-slate-900 text-sm rounded-xl"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                placeholder="Type your note..."
                autoFocus
              />
            ) : (
              <div 
                className="w-full h-full p-4 text-slate-900 text-sm whitespace-pre-wrap overflow-hidden cursor-text"
                onClick={() => !locked && setIsEditing(true)}
              >
                {content || 'Double-click to edit'}
              </div>
            )}
            {renderResizeHandles()}
            {renderConnections()}
          </motion.div>
        );

      case 'line':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`${baseClasses} cursor-move`}
            style={{ left: x, top: y, transform }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <svg width={width} height="8">
              <line
                x1="0"
                y1="4"
                x2={width}
                y2="4"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            </svg>
            {renderConnections()}
          </motion.div>
        );

      case 'arrow':
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`${baseClasses} cursor-move`}
            style={{ left: x, top: y, transform }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <svg width={width} height="24">
              <defs>
                <marker
                  id={`arrowhead-${id}`}
                  markerWidth="12"
                  markerHeight="8"
                  refX="11"
                  refY="4"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 12 4, 0 8"
                    fill={color}
                  />
                </marker>
              </defs>
              <line
                x1="0"
                y1="12"
                x2={width - 12}
                y2="12"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                markerEnd={`url(#arrowhead-${id})`}
              />
            </svg>
            {renderConnections()}
          </motion.div>
        );

      case 'pen':
        if (points.length < 2) return null;
        
        const minX = Math.min(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxX = Math.max(...points.map(p => p.x));
        const maxY = Math.max(...points.map(p => p.y));
        
        return (
          <motion.div
            ref={elementRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`${baseClasses} cursor-move`}
            style={{
              left: minX,
              top: minY,
              width: maxX - minX,
              height: maxY - minY,
              transform
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <svg width={maxX - minX} height={maxY - minY}>
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
                d={`M ${points.map(p => `${p.x - minX},${p.y - minY}`).join(' L ')}`}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {renderConnections()}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {renderElement()}
      
      {/* Element Controls */}
      <AnimatePresence>
        {(isSelected || isHovered) && type !== 'kanban' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute -top-12 left-0 flex items-center space-x-2 bg-white rounded-xl shadow-lg border border-slate-200 px-3 py-2 z-20"
            style={{ left: x, top: y - 48 }}
          >
            <button
              onClick={handleLockToggle}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title={locked ? 'Unlock' : 'Lock'}
            >
              {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </button>
            
            <button
              onClick={() => setShowConnectionMode(!showConnectionMode)}
              className={`p-1.5 hover:bg-slate-100 rounded-lg transition-colors ${
                connected.length > 0 ? 'text-blue-600' : 'text-slate-600'
              }`}
              title="Connect to other elements"
            >
              {connected.length > 0 ? <Link className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
            </button>

            <div className="w-px h-4 bg-slate-300" />
            
            <span className="text-xs text-slate-500 font-medium">
              <Move className="h-3 w-3 inline mr-1" />
              Drag to move • Corners to resize
            </span>
          </motion.div>
        )}

        {/* Connection Mode Panel */}
        {showConnectionMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bg-white rounded-xl shadow-xl border border-slate-200 p-4 min-w-[250px] z-30"
            style={{ left: x, top: y - 160 }}
          >
            <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
              <Link className="h-4 w-4 mr-2 text-blue-600" />
              Connect to Elements
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {allElements
                .filter(el => el.id !== id)
                .map(element => (
                  <button
                    key={element.id}
                    onClick={() => handleConnect(element.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between ${
                      connected.includes(element.id)
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                        : 'hover:bg-slate-100 text-slate-700 border border-transparent'
                    }`}
                  >
                    <span>
                      <span className="font-medium capitalize">{element.type}</span>
                      {element.content && (
                        <span className="text-xs text-slate-500 ml-2">
                          {element.content.substring(0, 15)}...
                        </span>
                      )}
                    </span>
                    {connected.includes(element.id) && (
                      <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">
                        Connected
                      </span>
                    )}
                  </button>
                ))}
              {allElements.filter(el => el.id !== id).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No other elements to connect to
                </p>
              )}
            </div>
            <button
              onClick={() => setShowConnectionMode(false)}
              className="mt-3 w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-700 transition-colors font-medium"
            >
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}