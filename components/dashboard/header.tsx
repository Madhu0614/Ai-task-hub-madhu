"use client";

import { motion } from 'framer-motion';
import { 
  Bell, 
  Grid3x3, 
  UserPlus, 
  Zap,
  MoreHorizontal,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm"
    >
      {/* Logo */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="text-xl font-bold text-slate-900">miro</span>
          <span className="text-xs bg-gradient-to-r from-blue-100 to-violet-100 text-blue-700 px-3 py-1 rounded-full font-medium">Free</span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          className="text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite members
        </Button>
        
        <Button
          size="sm"
          className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Zap className="h-4 w-4 mr-2" />
          Upgrade
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Grid3x3 className="h-5 w-5 text-slate-600" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors relative"
        >
          <Bell className="h-5 w-5 text-slate-600" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-1 h-10 w-10 rounded-full hover:bg-slate-100">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatar_url} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-sm font-medium">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-xl rounded-xl">
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:bg-red-50 focus:bg-red-50">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}