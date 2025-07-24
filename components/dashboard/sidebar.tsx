"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Home, 
  Clock, 
  Star, 
  Plus, 
  Compass,
  ChevronDown,
  Settings,
  Users,
  Bell
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { User } from '@/lib/auth';

interface SidebarProps {
  user: User;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Sidebar({ user, currentPage, onPageChange }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [spacesExpanded, setSpacesExpanded] = useState(true);

  const navigationItems = [
    { id: 'explore', label: 'Explore', icon: Compass, color: 'text-violet-600' },
    { id: 'home', label: 'Home', icon: Home, color: 'text-blue-600' },
    { id: 'recent', label: 'Recent', icon: Clock, color: 'text-slate-600' },
    { id: 'starred', label: 'Starred', icon: Star, color: 'text-orange-500' },
  ];

  return (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-72 bg-white border-r border-slate-200 h-full flex flex-col shadow-sm"
    >
      {/* User Profile */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10 ring-2 ring-slate-100">
            <AvatarImage src={user.avatar_url} alt={user.name} />
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-600 text-white text-sm font-medium">
              {user.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.team}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-8 w-8 rounded-xl hover:bg-slate-100"
          >
            <Plus className="h-4 w-4 text-slate-600" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by title or topic"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 focus:bg-white text-sm h-10 rounded-xl transition-all duration-200"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3">
        <nav className="space-y-1">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-violet-50 text-blue-700 shadow-sm border border-blue-100'
                    : `text-slate-700 hover:bg-slate-50 hover:text-slate-900`
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : item.color}`} />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        <Separator className="my-6" />

        {/* Spaces */}
        <div>
          <button
            onClick={() => setSpacesExpanded(!spacesExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-all duration-200"
          >
            <span>Spaces</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6 rounded-lg hover:bg-slate-200"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle add space
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <motion.div
                animate={{ rotate: spacesExpanded ? 0 : -90 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </div>
          </button>
          
          <AnimatePresence>
            {spacesExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-4 space-y-1 mt-2"
              >
                <div className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-violet-600 rounded-lg shadow-sm"></div>
                  <span>Team Workspace</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-100 space-y-2">
        {/* Notification Button for Invites */}
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all duration-200 relative"
          onClick={() => {/* TODO: open notification modal */}}
        >
          <Bell className="h-4 w-4 mr-3" />
          <span className="text-sm">Notifications</span>
          {/* Example badge for unread notifications */}
          <span className="absolute right-4 top-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">1</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all duration-200"
        >
          <Users className="h-4 w-4 mr-3" />
          <span className="text-sm">Team Members</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all duration-200"
        >
          <Settings className="h-4 w-4 mr-3" />
          <span className="text-sm">Settings</span>
        </Button>
      </div>
    </motion.div>
  );
}