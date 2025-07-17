"use client";

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Edit3, GripVertical, Palette } from 'lucide-react';

interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  color?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  color?: string;
}

interface KanbanBoardProps {
  data: {
    columns: KanbanColumn[];
  };
  onUpdate: (data: { columns: KanbanColumn[] }) => void;
  locked?: boolean;
}

const cardColors = [
  { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-50', border: 'border-blue-200' },
  { name: 'Violet', value: '#8B5CF6', bg: 'bg-violet-50', border: 'border-violet-200' },
  { name: 'Emerald', value: '#10B981', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { name: 'Orange', value: '#F97316', bg: 'bg-orange-50', border: 'border-orange-200' },
  { name: 'Red', value: '#EF4444', bg: 'bg-red-50', border: 'border-red-200' },
  { name: 'Pink', value: '#EC4899', bg: 'bg-pink-50', border: 'border-pink-200' },
  { name: 'Teal', value: '#14B8A6', bg: 'bg-teal-50', border: 'border-teal-200' },
  { name: 'Slate', value: '#64748B', bg: 'bg-slate-50', border: 'border-slate-200' }
];

const priorityColors = {
  low: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  high: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
};

export default function KanbanBoard({ data, onUpdate, locked = false }: KanbanBoardProps) {
  const [draggedCard, setDraggedCard] = useState<{ card: KanbanCard; columnId: string } | null>(null);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const dragOverColumn = useRef<string | null>(null);

  const addCard = (columnId: string) => {
    if (locked) return;
    
    const newCard: KanbanCard = {
      id: crypto.randomUUID(),
      title: 'New Task',
      description: 'Click to edit description',
      color: '#3B82F6',
      priority: 'medium',
      tags: []
    };

    const updatedColumns = data.columns.map(col =>
      col.id === columnId
        ? { ...col, cards: [...col.cards, newCard] }
        : col
    );

    onUpdate({ columns: updatedColumns });
    setEditingCard(newCard.id);
  };

  const removeCard = (columnId: string, cardId: string) => {
    if (locked) return;

    const updatedColumns = data.columns.map(col =>
      col.id === columnId
        ? { ...col, cards: col.cards.filter(card => card.id !== cardId) }
        : col
    );

    onUpdate({ columns: updatedColumns });
  };

  const updateCard = (columnId: string, cardId: string, updates: Partial<KanbanCard>) => {
    if (locked) return;

    const updatedColumns = data.columns.map(col =>
      col.id === columnId
        ? {
            ...col,
            cards: col.cards.map(card =>
              card.id === cardId ? { ...card, ...updates } : card
            )
          }
        : col
    );

    onUpdate({ columns: updatedColumns });
  };

  const updateColumnTitle = (columnId: string, newTitle: string) => {
    if (locked) return;

    const updatedColumns = data.columns.map(col =>
      col.id === columnId ? { ...col, title: newTitle } : col
    );

    onUpdate({ columns: updatedColumns });
  };

  const addColumn = () => {
    if (locked) return;

    const newColumn: KanbanColumn = {
      id: crypto.randomUUID(),
      title: 'New Column',
      cards: [],
      color: '#6366F1'
    };

    onUpdate({ columns: [...data.columns, newColumn] });
  };

  const removeColumn = (columnId: string) => {
    if (locked) return;

    const updatedColumns = data.columns.filter(col => col.id !== columnId);
    onUpdate({ columns: updatedColumns });
  };

  const handleDragStart = (card: KanbanCard, columnId: string) => {
    if (locked) return;
    setDraggedCard({ card, columnId });
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    dragOverColumn.current = columnId;
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    if (!draggedCard || locked) return;

    const { card, columnId: sourceColumnId } = draggedCard;

    if (sourceColumnId === targetColumnId) {
      setDraggedCard(null);
      return;
    }

    // Remove card from source column and add to target column
    const updatedColumns = data.columns.map(col => {
      if (col.id === sourceColumnId) {
        return { ...col, cards: col.cards.filter(c => c.id !== card.id) };
      }
      if (col.id === targetColumnId) {
        return { ...col, cards: [...col.cards, card] };
      }
      return col;
    });

    onUpdate({ columns: updatedColumns });
    setDraggedCard(null);
    dragOverColumn.current = null;
  };

  const getCardColorStyle = (color: string) => {
    const colorConfig = cardColors.find(c => c.value === color);
    return colorConfig || cardColors[0];
  };

  return (
    <div className="flex gap-4 p-4 h-full overflow-x-auto">
      <AnimatePresence>
        {data.columns.map((column, index) => (
          <motion.div
            key={column.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.1 }}
            className={`flex-shrink-0 w-72 bg-slate-50 rounded-xl p-4 border-2 transition-all duration-200 ${
              dragOverColumn.current === column.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200'
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 flex-1">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: column.color || '#6366F1' }}
                />
                {editingColumn === column.id ? (
                  <input
                    type="text"
                    value={column.title}
                    onChange={(e) => updateColumnTitle(column.id, e.target.value)}
                    onBlur={() => setEditingColumn(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingColumn(null);
                      if (e.key === 'Escape') setEditingColumn(null);
                    }}
                    className="text-sm font-semibold bg-transparent border-none outline-none text-slate-900 flex-1"
                    autoFocus
                  />
                ) : (
                  <h4
                    className="text-sm font-semibold text-slate-900 cursor-pointer flex-1"
                    onClick={() => !locked && setEditingColumn(column.id)}
                  >
                    {column.title}
                  </h4>
                )}
                <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
                  {column.cards.length}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => addCard(column.id)}
                  disabled={locked}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
                  title="Add Card"
                >
                  <Plus className="h-4 w-4" />
                </button>
                {data.columns.length > 1 && (
                  <button
                    onClick={() => removeColumn(column.id)}
                    disabled={locked}
                    className="p-1.5 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Remove Column"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {column.cards.map((card, cardIndex) => {
                  const colorStyle = getCardColorStyle(card.color || '#3B82F6');
                  const priorityStyle = priorityColors[card.priority || 'medium'];
                  
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10, scale: 0.9 }}
                      transition={{ delay: cardIndex * 0.05 }}
                      draggable={!locked}
                      onDragStart={() => handleDragStart(card, column.id)}
                      className={`bg-white rounded-lg p-4 shadow-sm border-l-4 group hover:shadow-md transition-all duration-200 cursor-move ${
                        draggedCard?.card.id === card.id ? 'opacity-50 scale-95' : ''
                      }`}
                      style={{ borderLeftColor: card.color }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <GripVertical className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div 
                            className={`w-2 h-2 rounded-full ${priorityStyle.dot}`}
                            title={`${card.priority} priority`}
                          />
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setShowColorPicker(showColorPicker === card.id ? null : card.id)}
                            disabled={locked}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 disabled:opacity-50"
                            title="Change Color"
                          >
                            <Palette className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeCard(column.id, card.id)}
                            disabled={locked}
                            className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 disabled:opacity-50"
                            title="Remove Card"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Color Picker */}
                      <AnimatePresence>
                        {showColorPicker === card.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute z-10 bg-white rounded-lg shadow-lg border border-slate-200 p-2 mb-2"
                          >
                            <div className="grid grid-cols-4 gap-1">
                              {cardColors.map((color) => (
                                <button
                                  key={color.value}
                                  onClick={() => {
                                    updateCard(column.id, card.id, { color: color.value });
                                    setShowColorPicker(null);
                                  }}
                                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                                  style={{ backgroundColor: color.value }}
                                  title={color.name}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {editingCard === card.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={card.title}
                            onChange={(e) => updateCard(column.id, card.id, { title: e.target.value })}
                            className="w-full text-sm font-medium bg-transparent border-none outline-none text-slate-900"
                            placeholder="Task title"
                          />
                          <textarea
                            value={card.description || ''}
                            onChange={(e) => updateCard(column.id, card.id, { description: e.target.value })}
                            className="w-full text-xs bg-transparent border-none outline-none text-slate-600 resize-none"
                            rows={2}
                            placeholder="Task description"
                          />
                          <div className="flex items-center space-x-2">
                            <select
                              value={card.priority || 'medium'}
                              onChange={(e) => updateCard(column.id, card.id, { priority: e.target.value as 'low' | 'medium' | 'high' })}
                              className="text-xs bg-transparent border border-slate-200 rounded px-2 py-1 outline-none"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                            <button
                              onClick={() => setEditingCard(null)}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer"
                          onClick={() => !locked && setEditingCard(card.id)}
                        >
                          <h5 className="text-sm font-medium text-slate-900 mb-2 line-clamp-2">
                            {card.title}
                          </h5>
                          {card.description && (
                            <p className="text-xs text-slate-600 mb-3 line-clamp-3">
                              {card.description}
                            </p>
                          )}
                          
                          {/* Priority Badge */}
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-1 rounded-full ${priorityStyle.bg} ${priorityStyle.text}`}>
                              {card.priority}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCard(card.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-all"
                              title="Edit Card"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Add Card Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => addCard(column.id)}
              disabled={locked}
              className="w-full mt-4 p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mx-auto" />
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add Column Button */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: data.columns.length * 0.1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={addColumn}
        disabled={locked}
        className="flex-shrink-0 w-72 h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="text-center">
          <Plus className="h-6 w-6 mx-auto mb-2" />
          <span className="text-sm font-medium">Add Column</span>
        </div>
      </motion.button>
    </div>
  );
}