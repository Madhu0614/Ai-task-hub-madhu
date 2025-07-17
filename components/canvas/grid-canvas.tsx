"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface GridCanvasProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  children?: React.ReactNode;
  isPanMode?: boolean;
}

export default function GridCanvas({ zoom, onZoomChange, children, isPanMode = false }: GridCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate grid size based on zoom level
  const getGridSize = useCallback(() => {
    const baseSize = 20;
    const scaledSize = baseSize * (zoom / 100);
    
    // Adjust grid density based on zoom level
    if (scaledSize < 8) return baseSize * 2 * (zoom / 100);
    if (scaledSize > 80) return baseSize * 0.5 * (zoom / 100);
    return scaledSize;
  }, [zoom]);

  // Handle mouse wheel for zooming
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      const newZoom = Math.max(10, Math.min(500, zoom + delta));
      onZoomChange(newZoom);
    } else if (e.shiftKey) {
      // Horizontal scrolling
      e.preventDefault();
      setPan(prev => ({ ...prev, x: prev.x - e.deltaY }));
    } else {
      // Vertical scrolling
      e.preventDefault();
      setPan(prev => ({ ...prev, y: prev.y - e.deltaY }));
    }
  }, [zoom, onZoomChange]);

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.altKey || isPanMode))) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan, isPanMode]);

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp, isDragging]);

  const gridSize = getGridSize();
  const opacity = Math.max(0.1, Math.min(0.4, zoom / 150));

  return (
    <div
      ref={canvasRef}
      className={`w-full h-full relative overflow-hidden bg-slate-50 ${
        isPanMode || isDragging ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
      onMouseDown={handleMouseDown}
    >
      {/* Fine Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, ${opacity * 0.3}) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, ${opacity * 0.3}) 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${pan.x % gridSize}px ${pan.y % gridSize}px`,
        }}
      />

      {/* Major Grid Lines (every 5th line) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, ${opacity * 0.6}) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, ${opacity * 0.6}) 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize * 5}px ${gridSize * 5}px`,
          backgroundPosition: `${pan.x % (gridSize * 5)}px ${pan.y % (gridSize * 5)}px`,
        }}
      />

      {/* Canvas Content */}
      <motion.div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
          transformOrigin: '0 0'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>

      {/* Zoom Level Indicator */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1 text-sm text-slate-600 border border-slate-200 pointer-events-none shadow-sm"
      >
        {zoom}%
      </motion.div>

      {/* Pan Indicator (when panning) */}
      {isDragging && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4 bg-indigo-100 backdrop-blur-sm rounded-lg px-3 py-1 text-sm text-indigo-700 border border-indigo-200 pointer-events-none shadow-sm"
        >
          Panning...
        </motion.div>
      )}
    </div>
  );
}