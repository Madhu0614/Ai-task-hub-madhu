import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types
export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  team: string;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  name: string;
  type: string;
  owner_id: string;
  starred: boolean;
  thumbnail?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface BoardElement {
  id: string;
  board_id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  stroke_width?: number;
  points?: { x: number; y: number }[];
  rotation: number;
  locked: boolean;
  kanban_data?: any;
  created_at: string;
  updated_at: string;
}

export interface BoardCollaborator {
  id: string;
  board_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: Profile;
}

export interface UserCursor {
  id: string;
  board_id: string;
  user_id: string;
  x: number;
  y: number;
  updated_at: string;
  profiles?: Profile;
}

// Test Supabase connection
export const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key:', supabaseAnonKey ? 'Present' : 'Missing');
    
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
};

// Check if user is authenticated
export const checkAuth = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth check error:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Auth check failed:', error);
    return null;
  }
};