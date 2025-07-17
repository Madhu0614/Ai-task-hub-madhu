"use client";

import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { BoardTemplate } from '@/lib/boards';

interface TemplateCardProps {
  template: BoardTemplate;
  onClick: () => void;
  index: number;
}

export default function TemplateCard({ template, onClick, index }: TemplateCardProps) {
  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'blank':
        return <Plus className="h-8 w-8 text-slate-400" />;
      case 'flowchart':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-orange-400 rounded-sm"></div>
            <div className="w-2 h-2 bg-slate-800 rounded-full"></div>
          </div>
        );
      case 'mindmap':
        return (
          <div className="relative">
            <div className="w-4 h-1 bg-green-400 rounded-full absolute -rotate-45"></div>
            <div className="w-4 h-1 bg-purple-400 rounded-full absolute rotate-45"></div>
            <div className="w-4 h-1 bg-blue-400 rounded-full absolute rotate-90"></div>
          </div>
        );
      case 'kanban':
        return (
          <div className="grid grid-cols-3 gap-1">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-slate-300 rounded-sm"></div>
            ))}
          </div>
        );
      case 'retrospective':
        return (
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-purple-400 rounded-sm"></div>
          </div>
        );
      case 'brainwriting':
        return (
          <div className="grid grid-cols-2 gap-1">
            <div className="w-3 h-3 bg-yellow-300 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-300 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-300 rounded-sm"></div>
            <div className="w-3 h-3 bg-purple-300 rounded-sm"></div>
          </div>
        );
      default:
        return <div className="w-4 h-4 bg-slate-300 rounded-sm"></div>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className="bg-white border border-slate-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
            {getTemplateIcon(template.type)}
          </div>
          <div>
            <h3 className="font-medium text-slate-900 text-sm">{template.name}</h3>
          </div>
        </div>
      </div>
    </motion.div>
  );
}