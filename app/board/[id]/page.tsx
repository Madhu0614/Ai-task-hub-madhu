"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Users, Share2, MoreHorizontal, ZoomIn, ZoomOut, MousePointer, Square,
  Circle, Type, Pen, Minus, MessageSquare, StickyNote, Upload, Undo, Redo, Play,
  MessageCircle, Monitor, Crown, Hand, Triangle, ArrowRight, Image as ImageIcon,
  Grid3x3, Sparkles, Move, RotateCcw, Trash2, Copy, Lock, Columns, UserPlus, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { getCurrentUser, User } from '@/lib/auth';
import { boardService } from '@/lib/boards';
import { RealtimeCollaboration, CursorPosition } from '@/lib/realtime';
import type { Board, BoardElement } from '@/lib/supabase';
import GridCanvas from '@/components/canvas/grid-canvas';
import CanvasElement from '@/components/canvas/canvas-element';
import CollaborationCursors from '@/components/canvas/collaboration-cursors';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeCursors } from '@/components/canvas/collaboration-cursors';
import { useRealtimeBoard } from '@/components/canvas/collaboration-cursors';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

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
}

interface CanvasElementData {
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
  connected?: string[];
  kanbanData?: {
    columns: KanbanColumn[];
  };
}

const elementDefaults = {
  rectangle: { width: 120, height: 80, color: '#3B82F6' },
  circle: { width: 100, height: 100, color: '#10B981' },
  frame: { width: 200, height: 150, color: '#8B5CF6' },
  text: { content: 'Type here...', color: '#1f2937' },
  sticky: { width: 120, height: 120, color: '#F97316', content: '' },
  line: { width: 100, height: 2, color: '#64748B' },
  arrow: { width: 100, height: 2, color: '#64748B' },
  kanban: { 
    width: 600, 
    height: 400, 
    kanbanData: {
      columns: [
        {
          id: 'todo',
          title: 'To Do',
          cards: [
            { id: '1', title: 'Task 1', description: 'Description for task 1', color: '#EF4444' },
            { id: '2', title: 'Task 2', description: 'Description for task 2', color: '#F97316' }
          ]
        },
        {
          id: 'inprogress',
          title: 'In Progress',
          cards: [
            { id: '3', title: 'Task 3', description: 'Description for task 3', color: '#3B82F6' }
          ]
        },
        {
          id: 'done',
          title: 'Done',
          cards: [
            { id: '4', title: 'Task 4', description: 'Description for task 4', color: '#10B981' }
          ]
        }
      ]
    }
  }
} as const;

export default function BoardPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.id as string;
  const { toast } = useToast();

  // Move all state and ref declarations to the top
  const [user, setUser] = useState<User | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState('select');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [elements, setElements] = useState<CanvasElementData[]>([]);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [renderPath, setRenderPath] = useState<{ x: number; y: number }[]>([]);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<CanvasElementData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>(['']);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [currentUserCursor, setCurrentUserCursor] = useState<{ x: number; y: number } | null>(null);
  const realtimeRef = useRef<RealtimeCollaboration | null>(null);
  const cursorUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add state for all users and loading
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Add state for notification modal
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);

  // Fetch collaborators after loading the board
  useEffect(() => {
    if (board) {
      boardService.getCollaborators(board.id).then(setCollaborators);
    }
  }, [board]);

  // Fetch all users when invite modal is opened
  useEffect(() => {
    if (showInviteModal) {
      setLoadingUsers(true);
      setInviteError(null);
      supabase.from('user_list').select('id, name, email, avatar_url').then(({ data, error }) => {
        if (error) setInviteError('Failed to load users');
        setAllUsers(data || []);
        setLoadingUsers(false);
      });
    }
  }, [showInviteModal]);

  // Fetch pending invites when modal is opened
  useEffect(() => {
    if (showNotificationModal) {
      setLoadingInvites(true);
      setInviteActionError(null);
      boardService.getPendingInvites()
        .then(setPendingInvites)
        .catch(err => setInviteActionError(err.message || 'Failed to load invites'))
        .finally(() => setLoadingInvites(false));
    }
  }, [showNotificationModal]);

  // Get current collaborators' user IDs
  const collaboratorIds = collaborators.map((c: any) => c.user_id);

  // Invite handler
  async function handleInvite(user: any) {
    setInviteError(null);
    try {
      await boardService.inviteUser(boardId, user.email);
      setShowInviteModal(false);
      // Refresh collaborators list after inviting
      boardService.getCollaborators(boardId).then(setCollaborators);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite user');
    }
  }

  async function handleAcceptInvite(inviteId: string) {
    setInviteActionError(null);
    try {
      await boardService.acceptInvite(inviteId);
      setPendingInvites(invites => invites.filter(inv => inv.id !== inviteId));
    } catch (err: any) {
      setInviteActionError(err.message || 'Failed to accept invite');
    }
  }

  async function handleRejectInvite(inviteId: string) {
    setInviteActionError(null);
    try {
      await boardService.rejectInvite(inviteId);
      setPendingInvites(invites => invites.filter(inv => inv.id !== inviteId));
    } catch (err: any) {
      setInviteActionError(err.message || 'Failed to reject invite');
    }
  }

  // Now call the realtime cursors hook
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://ai-task-hub-madhu.onrender.com';
  const { cursors: wsCursors, sendCursor } = useRealtimeCursors({
    wsUrl,
    userId: user?.id ?? "",
    userName: user?.name ?? "",
    avatarUrl: user?.avatar_url ?? "",
    boardId: boardId ?? ""
  });

  // Add the realtime board hook and log connectionStatus after it is defined
  const { sendElementUpdate, connectionStatus } = useRealtimeBoard({
    wsUrl,
    userId: user?.id ?? "",
    boardId: boardId ?? "",
    setElements,
  });

  useEffect(() => {
    console.log("WebSocket connection status effect running:", connectionStatus);
    console.log("WebSocket connection status:", connectionStatus);
  }, [connectionStatus]);

  useEffect(() => {
    const initializeBoard = async () => {
      try {
        console.log('Initializing board:', boardId);
        
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          console.log('No user found, redirecting to login');
          router.push('/login');
          return;
        }
        
        console.log('Current user:', currentUser);
        setUser(currentUser);

        console.log('Fetching board data...');
        const boardData = await boardService.getBoard(boardId);
        if (!boardData) {
          console.log('Board not found');
          toast({
            title: "Board not found",
            description: "The board you're looking for doesn't exist or you don't have access to it.",
            variant: "destructive",
          });
          router.push('/dashboard');
          return;
        }
        
        console.log('Board data:', boardData);
        setBoard(boardData);

        // Load board elements
        console.log('Loading board elements...');
        const boardElements = await boardService.getBoardElements(boardId);
        console.log('Board elements:', boardElements);
        
        const convertedElements: CanvasElementData[] = boardElements.map(element => ({
          id: element.id,
          type: element.type as any,
          x: element.x,
          y: element.y,
          width: element.width || undefined,
          height: element.height || undefined,
          content: element.content || undefined,
          color: element.color || undefined,
          strokeWidth: element.stroke_width || undefined,
          points: element.points || undefined,
          rotation: element.rotation,
          locked: element.locked,
          connected: [], // Initialize empty connections
          kanbanData: element.kanban_data || undefined,
        }));
        setElements(convertedElements);

        // Initialize real-time collaboration
        console.log('Initializing real-time collaboration...');
        realtimeRef.current = new RealtimeCollaboration(boardId, currentUser.id);
        await realtimeRef.current.initialize(
          (newCursors) => setCursors(newCursors),
          (newElements) => {
            const converted: CanvasElementData[] = newElements.map(element => ({
              id: element.id,
              type: element.type as any,
              x: element.x,
              y: element.y,
              width: element.width || undefined,
              height: element.height || undefined,
              content: element.content || undefined,
              color: element.color || undefined,
              strokeWidth: element.stroke_width || undefined,
              points: element.points || undefined,
              rotation: element.rotation,
              locked: element.locked,
              connected: [], // Initialize empty connections
              kanbanData: element.kanban_data || undefined,
            }));
            setElements(converted);
          }
        );

        setLoading(false);
        console.log('Board initialization complete');
      } catch (error) {
        console.error('Error initializing board:', error);
        toast({
          title: "Error loading board",
          description: error instanceof Error ? error.message : "Failed to load board",
          variant: "destructive",
        });
        router.push('/dashboard');
      }
    };

    if (boardId) {
      initializeBoard();
    }

    return () => {
      if (realtimeRef.current) {
        realtimeRef.current.cleanup();
      }
      if (cursorUpdateTimeoutRef.current) {
        clearTimeout(cursorUpdateTimeoutRef.current);
      }
    };
  }, [router, boardId, toast]);

  const saveToHistory = useCallback((newElements: CanvasElementData[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const saveElementToDatabase = useCallback(async (element: CanvasElementData, isUpdate = false) => {
    try {
      const elementData = {
        board_id: boardId,
        type: element.type,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        content: element.content,
        color: element.color,
        stroke_width: element.strokeWidth,
        points: element.points,
        rotation: element.rotation || 0,
        locked: element.locked || false,
        kanban_data: element.kanbanData,
      };

      if (isUpdate) {
        await boardService.updateElement(element.id, elementData);
      } else {
        await boardService.createElement(elementData);
      }
    } catch (error) {
      console.error('Error saving element:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
  }, [boardId, toast]);

  const handleCanvasClick = useCallback(async (e: React.MouseEvent) => {
    if (selectedTool === 'select' || selectedTool === 'hand') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const defaults = elementDefaults[selectedTool as keyof typeof elementDefaults] || {};

    let newElement: CanvasElementData;

    if (selectedTool === 'kanban') {
      const kanbanDefaults = elementDefaults.kanban;
      newElement = {
        id: crypto.randomUUID(),
        type: 'kanban',
        x: x - (kanbanDefaults.width / 2),
        y: y - (kanbanDefaults.height / 2),
        width: kanbanDefaults.width,
        height: kanbanDefaults.height,
        rotation: 0,
        locked: false,
        connected: [],
        kanbanData: {
          columns: kanbanDefaults.kanbanData.columns.map(col => ({
            ...col,
            cards: col.cards.map(card => ({ ...card }))
          }))
        }
      };
    } else {
      const { width = 50, height = 50, ...restDefaults } = defaults as {
        width?: number;
        height?: number;
        [key: string]: any;
      };

      newElement = {
        id: crypto.randomUUID(),
        type: selectedTool as CanvasElementData['type'],
        x: x - (width / 2),
        y: y - (height / 2),
        width,
        height,
        rotation: 0,
        locked: false,
        connected: [],
        ...restDefaults
      };
    }

    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedTool('select');
    setSelectedElements([newElement.id]);

    // Broadcast creation to other users via WebSocket
    sendElementUpdate(newElement, 'create');

    // Save to database
    await saveElementToDatabase(newElement);
  }, [selectedTool, elements, saveToHistory, saveElementToDatabase, sendElementUpdate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update current user cursor position
    setCurrentUserCursor({ x, y });

    // Instantly update cursor position for real-time collaboration
    sendCursor(x, y);

    // Existing mouse move logic
    if (isDragging && selectedElements.length > 0 && dragOffset) {
      const newElements = elements.map(el =>
        selectedElements.includes(el.id) && !el.locked
          ? { ...el, x: x - dragOffset.x, y: y - dragOffset.y }
          : el
      );
      setElements(newElements);
    }

    if (isDrawing && selectedTool === 'pen') {
      currentPathRef.current.push({ x, y });
      setRenderPath([...currentPathRef.current]);
    }
  }, [isDragging, selectedElements, dragOffset, isDrawing, selectedTool, elements, sendCursor]);

  const handleElementUpdate = useCallback(async (id: string, updates: Partial<CanvasElementData>) => {
    const newElements = elements.map((el: CanvasElementData) => el.id === id ? { ...el, ...updates } : el);
    setElements(newElements);

    // Broadcast to other users via WebSocket
    const updatedElement = newElements.find((el: CanvasElementData) => el.id === id);
    if (updatedElement) {
      sendElementUpdate(updatedElement, "update");
      await saveElementToDatabase(updatedElement, true);
    }
  }, [elements, saveElementToDatabase, sendElementUpdate]);

  const handleConnect = useCallback((fromId: string, toId: string) => {
    const newElements = elements.map(el => {
      if (el.id === fromId) {
        const connected = el.connected || [];
        if (!connected.includes(toId)) {
          return { ...el, connected: [...connected, toId] };
        }
      }
      return el;
    });
    setElements(newElements);
  }, [elements]);

  const handleDisconnect = useCallback((fromId: string, toId: string) => {
    const newElements = elements.map(el => {
      if (el.id === fromId) {
        const connected = el.connected || [];
        return { ...el, connected: connected.filter(id => id !== toId) };
      }
      return el;
    });
    setElements(newElements);
  }, [elements]);

  const addInviteEmail = () => {
    setInviteEmails([...inviteEmails, '']);
  };

  const removeInviteEmail = (index: number) => {
    if (inviteEmails.length > 1) {
      setInviteEmails(inviteEmails.filter((_, i) => i !== index));
    }
  };

  const updateInviteEmail = (index: number, email: string) => {
    const newEmails = [...inviteEmails];
    newEmails[index] = email;
    setInviteEmails(newEmails);
  };

  const handleInviteCollaborators = async () => {
    const validEmails = inviteEmails.filter(email => email.trim() && email.includes('@'));
    
    if (validEmails.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      const results = await Promise.allSettled(
        validEmails.map(email => boardService.inviteUser(boardId, email.trim()))
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      if (successful > 0) {
        toast({
          title: "Invitations sent",
          description: `${successful} collaborator${successful > 1 ? 's' : ''} invited successfully.`,
        });
      }

      if (failed > 0) {
        toast({
          title: "Some invitations failed",
          description: `${failed} invitation${failed > 1 ? 's' : ''} could not be sent.`,
          variant: "destructive",
        });
      }

      setInviteEmails(['']);
      setShowInviteModal(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitations",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-slate-600">Loading board...</p>
        </div>
      </div>
    );
  }

  if (!user || !board) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Board not found or access denied</p>
          <Button 
            onClick={() => router.push('/dashboard')}
            className="mt-4"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const toolbarItems = [
    { id: 'select', icon: MousePointer, label: 'Select', color: 'text-slate-600', bgColor: 'hover:bg-slate-100' },
    { id: 'hand', icon: Hand, label: 'Hand', color: 'text-blue-600', bgColor: 'hover:bg-blue-50' },
    { id: 'frame', icon: Square, label: 'Frame', color: 'text-violet-600', bgColor: 'hover:bg-violet-50' },
    { id: 'rectangle', icon: Square, label: 'Rectangle', color: 'text-blue-600', bgColor: 'hover:bg-blue-50' },
    { id: 'circle', icon: Circle, label: 'Circle', color: 'text-emerald-600', bgColor: 'hover:bg-emerald-50' },
    { id: 'text', icon: Type, label: 'Text', color: 'text-slate-700', bgColor: 'hover:bg-slate-100' },
    { id: 'pen', icon: Pen, label: 'Pen', color: 'text-orange-600', bgColor: 'hover:bg-orange-50' },
    { id: 'line', icon: Minus, label: 'Line', color: 'text-slate-600', bgColor: 'hover:bg-slate-100' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow', color: 'text-slate-600', bgColor: 'hover:bg-slate-100' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note', color: 'text-orange-600', bgColor: 'hover:bg-orange-50' },
    { id: 'kanban', icon: Columns, label: 'Kanban Board', color: 'text-violet-600', bgColor: 'hover:bg-violet-50' },
    { id: 'comment', icon: MessageSquare, label: 'Comment', color: 'text-blue-600', bgColor: 'hover:bg-blue-50' },
    { id: 'upload', icon: Upload, label: 'Upload', color: 'text-slate-600', bgColor: 'hover:bg-slate-100' },
    { id: 'apps', icon: Grid3x3, label: 'Apps', color: 'text-slate-600', bgColor: 'hover:bg-slate-100' },
  ];

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          {/* Make the logo clickable */}
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            tabIndex={0}
            aria-label="Go to dashboard"
          >
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-violet-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="font-bold text-lg text-slate-900">miro</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 text-blue-500">🚀</div>
            <span className="font-medium text-slate-900">{board.name}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex -space-x-1">
            {cursors.slice(0, 3).map((cursor, i) => (
              <Avatar key={cursor.user.id} className="w-8 h-8 border-2 border-white">
                <AvatarFallback className="text-white text-xs bg-blue-500">
                  {cursor.user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {cursors.length > 3 && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              +{cursors.length - 3}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Left Toolbar */}
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.1 }}
          className="w-14 bg-white border-r border-slate-200 flex flex-col items-center py-4 space-y-1 shadow-sm relative"
        >
          {toolbarItems.map((tool, index) => {
            const Icon = tool.icon;
            const isSelected = selectedTool === tool.id;
            return (
              <motion.button
                key={tool.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.1, delay: index * 0.02 }}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTool(tool.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-100 text-blue-600 shadow-md ring-2 ring-blue-200'
                    : `${tool.color} ${tool.bgColor} shadow-sm`
                }`}
                title={tool.label}
              >
                <Icon className="h-5 w-5" />
              </motion.button>
            );
          })}
          {/* Invite button at the bottom of the toolbar */}
          <Button
            variant="outline"
            size="icon"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50 shadow"
            onClick={() => setShowInviteModal(true)}
            title="Invite to Board"
          >
            <UserPlus className="h-5 w-5" />
          </Button>
          {/* Notification button at the bottom of the toolbar */}
          <Button
            variant="outline"
            size="icon"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50 shadow"
            onClick={() => setShowNotificationModal(true)}
            title="Pending Invites"
          >
            <Users className="h-5 w-5" />
          </Button>
        </motion.div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative">
          <GridCanvas 
            zoom={zoomLevel} 
            onZoomChange={setZoomLevel}
            isPanMode={selectedTool === 'hand'}
          >
            <div 
              className="w-full h-full relative"
              onClick={handleCanvasClick}
              onMouseMove={e => {
                handleMouseMove(e);
                if (user && boardId) {
                  sendCursor(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                }
              }}
              style={{ cursor: selectedTool === 'pen' ? 'crosshair' : selectedTool === 'hand' ? 'grab' : 'default' }}
            >
              <AnimatePresence>
                {elements.map(element => (
                  <CanvasElement
                    key={element.id}
                    {...element}
                    onUpdate={handleElementUpdate}
                    onSelect={(id) => setSelectedElements([id])}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    isSelected={selectedElements.includes(element.id)}
                    zoom={zoomLevel}
                    allElements={elements}
                  />
                ))}
              </AnimatePresence>
              
              {/* Real-time collaboration cursors */}
              <CollaborationCursors 
                cursors={Object.entries(wsCursors).map(([id, pos]) => ({
                  x: pos.x,
                  y: pos.y,
                  user: { id, name: pos.userName, avatar_url: pos.avatarUrl }
                }))}
                zoom={zoomLevel}
                currentUser={user ? { id: user.id, name: user.name, avatar_url: user.avatar_url } : undefined}
                currentUserCursor={currentUserCursor || undefined}
              />
            </div>
          </GridCanvas>

          {/* Zoom Controls */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="absolute bottom-6 right-6 flex items-center space-x-2 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg px-4 py-3"
          >
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-8 w-8 hover:bg-slate-100"
              onClick={() => setZoomLevel(Math.max(10, zoomLevel - 10))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600 min-w-[3rem] text-center font-medium">
              {zoomLevel}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-8 w-8 hover:bg-slate-100"
              onClick={() => setZoomLevel(Math.min(500, zoomLevel + 10))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Invite Modal (Dialog version, multi-email) */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
              <DialogContent className="max-w-md w-full">
                <DialogHeader>Invite Collaborators</DialogHeader>
                <div className="space-y-3 mt-4">
                  {inviteEmails.map((email, index) => (
                    <div key={index} className="flex space-x-2 items-center">
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => updateInviteEmail(index, e.target.value)}
                      />
                      {inviteEmails.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeInviteEmail(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={addInviteEmail}>
                    + Add another email
                  </Button>
                  {inviteError && <p className="text-red-500 text-sm">{inviteError}</p>}
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowInviteModal(false)}>Cancel</Button>
                  <Button onClick={handleInviteCollaborators}>Send Invites</Button>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {showNotificationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowNotificationModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Pending Invites</h3>
              {inviteActionError && <div className="text-red-500 mb-2">{inviteActionError}</div>}
              {loadingInvites ? (
                <div>Loading invites...</div>
              ) : (
                <ul className="max-h-64 overflow-y-auto divide-y">
                  {pendingInvites.length === 0 ? (
                    <li className="py-2 text-slate-500">No pending invites.</li>
                  ) : (
                    pendingInvites.map(invite => (
                      <li key={invite.id} className="flex items-center justify-between py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{invite.boards?.name || 'Board'}</span>
                          <span className="text-xs text-slate-500">Invited by {invite.user_list?.name || 'Someone'}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAcceptInvite(invite.id)}>Accept</Button>
                          <Button size="sm" variant="outline" onClick={() => handleRejectInvite(invite.id)}>Reject</Button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}