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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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