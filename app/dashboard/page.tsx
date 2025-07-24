"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getCurrentUser, User } from '@/lib/auth';
import { boardService, boardTemplates } from '@/lib/boards';
import type { Board } from '@/lib/supabase';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import TemplatesSection from '@/components/dashboard/templates-section';
import BoardsTable from '@/components/dashboard/boards-table';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [inviteBoards, setInviteBoards] = useState<{ [boardId: string]: string }>({});
  const [acceptingInviteId, setAcceptingInviteId] = useState<string | null>(null);
  const [acceptedInviteId, setAcceptedInviteId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }
        setUser(currentUser);
        await loadBoards();
        await loadPendingInvites(currentUser.email.toLowerCase());
        setLoading(false);
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        router.push('/login');
      }
    };
    initializeDashboard();
  }, [router]);

  const loadBoards = async () => {
    try {
      const allBoards = await boardService.getBoards();
      setBoards(allBoards);
    } catch (error) {
      console.error('Error loading boards:', error);
    }
  };

  const loadPendingInvites = async (email: string) => {
    const { data, error } = await supabase
      .from('pending_invites')
      .select('*')
      .eq('email', email.toLowerCase());
    if (!error) {
      setPendingInvites(data || []);
      // Fetch board names for each invite
      const boardIds = (data || []).map((invite: any) => invite.board_id);
      if (boardIds.length > 0) {
        const { data: boards } = await supabase
          .from('boards')
          .select('id, name')
          .in('id', boardIds);
        const boardMap: { [boardId: string]: string } = {};
        (boards || []).forEach((b: any) => {
          boardMap[b.id] = b.name;
        });
        setInviteBoards(boardMap);
      } else {
        setInviteBoards({});
      }
    }
  };

  const handleAcceptInvite = async (invite: any) => {
    setAcceptingInviteId(invite.id);
    setAcceptedInviteId(null);
    try {
      // Add as collaborator
      await boardService.inviteUser(invite.board_id, user!.email);
      // Remove the pending invite
      await supabase.from('pending_invites').delete().eq('id', invite.id);
      // Refresh invites
      await loadPendingInvites(user!.email.toLowerCase());
      await loadBoards();
      setAcceptedInviteId(invite.id);
      toast({
        title: 'Invite accepted!',
        description: `You are now a collaborator on "${inviteBoards[invite.board_id] || invite.board_id}".`,
      });
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept invite.',
        variant: 'destructive',
      });
    } finally {
      setAcceptingInviteId(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        user={user} 
        currentPage={currentPage} 
        onPageChange={setCurrentPage} 
      />
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TemplatesSection user={user} onBoardCreate={loadBoards} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <BoardsTable 
                boards={boards} 
                currentUser={user.id}
                onBoardsChange={loadBoards}
              />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}