"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MoreHorizontal, 
  Star, 
  Trash2, 
  Edit3, 
  Copy,
  Eye,
  Users,
  Grid3x3,
  List
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { boardService } from '@/lib/boards';
import type { Board } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface BoardsTableProps {
  boards: Board[];
  currentUser: string;
  onBoardsChange: () => void;
}

export default function BoardsTable({ boards, currentUser, onBoardsChange }: BoardsTableProps) {
  const [sortBy, setSortBy] = useState('last-opened');
  const [filterBy, setFilterBy] = useState('all-boards');
  const [ownedBy, setOwnedBy] = useState('anyone');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const router = useRouter();
  const { toast } = useToast();

  const getBoardTypeColor = (type: string) => {
    switch (type) {
      case 'blank': return 'bg-slate-100 text-slate-700';
      case 'flowchart': return 'bg-blue-100 text-blue-700';
      case 'mindmap': return 'bg-green-100 text-green-700';
      case 'kanban': return 'bg-purple-100 text-purple-700';
      case 'retrospective': return 'bg-orange-100 text-orange-700';
      case 'brainwriting': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getBoardTypeIcon = (type: string) => {
    switch (type) {
      case 'kanban': return '📋';
      case 'mindmap': return '🧠';
      default: return '📄';
    }
  };

  const handleStarToggle = async (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await boardService.toggleStar(boardId);
      onBoardsChange();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update board",
        variant: "destructive",
      });
    }
  };

  const handleBoardClick = (boardId: string) => {
    router.push(`/board/${boardId}`);
  };

  const handleDeleteBoard = async (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this board?')) {
      try {
        await boardService.deleteBoard(boardId);
        onBoardsChange();
        toast({
          title: "Board deleted",
          description: "The board has been successfully deleted.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete board",
          variant: "destructive",
        });
      }
    }
  };

  const sortedAndFilteredBoards = boards
    .filter(board => {
      if (filterBy === 'starred' && !board.starred) return false;
      if (ownedBy === 'me' && board.owner_id !== currentUser) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'last-opened':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

  if (boards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Grid3x3 className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">No boards yet</h3>
        <p className="text-slate-500 mb-4">Create your first board to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Boards in this team</h2>
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm">
            Explore templates
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Filter by</span>
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-boards">All boards</SelectItem>
                <SelectItem value="starred">Starred</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Owned by</span>
            <Select value={ownedBy} onValueChange={setOwnedBy}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anyone">Anyone</SelectItem>
                <SelectItem value="me">Me</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Sort by</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-opened">Last opened</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="created">Created</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="p-2"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="p-2"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700">Name</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700">Last opened</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700">Owner</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredBoards.map((board, index) => (
                <motion.tr
                  key={board.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={() => handleBoardClick(board.id)}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer group"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 flex items-center justify-center text-sm">
                        {getBoardTypeIcon(board.type)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{board.name}</div>
                        <div className="text-xs text-slate-500">
                          Modified {formatDistanceToNow(new Date(board.updated_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-slate-600">
                      {formatDistanceToNow(new Date(board.updated_at), { addSuffix: true })}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-slate-900">
                      {board.profiles?.name || 'Unknown'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleStarToggle(board.id, e)}
                        className="p-1 h-8 w-8 hover:bg-yellow-50"
                      >
                        <Star 
                          className={`h-4 w-4 ${
                            board.starred 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-slate-400 hover:text-yellow-400'
                          }`} 
                        />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 h-8 w-8 hover:bg-slate-100"
                          >
                            <MoreHorizontal className="h-4 w-4 text-slate-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Eye className="h-4 w-4 mr-2" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => handleDeleteBoard(board.id, e)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}