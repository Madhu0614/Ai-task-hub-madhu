import { supabase } from './supabase';
import type { UserCursor, BoardElement } from './supabase';

export interface CursorPosition {
  x: number;
  y: number;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export class RealtimeCollaboration {
  private boardId: string;
  private userId: string;
  private cursorsChannel: any;
  private elementsChannel: any;
  private onCursorsUpdate?: (cursors: CursorPosition[]) => void;
  private onElementsUpdate?: (elements: BoardElement[]) => void;

  constructor(boardId: string, userId: string) {
    this.boardId = boardId;
    this.userId = userId;
  }

  // Initialize real-time collaboration
  async initialize(
    onCursorsUpdate: (cursors: CursorPosition[]) => void,
    onElementsUpdate: (elements: BoardElement[]) => void
  ) {
    this.onCursorsUpdate = onCursorsUpdate;
    this.onElementsUpdate = onElementsUpdate;

    // Subscribe to cursor updates
    this.cursorsChannel = supabase
      .channel(`cursors:${this.boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_cursors',
          filter: `board_id=eq.${this.boardId}`,
        },
        () => {
          this.fetchCursors();
        }
      )
      .subscribe();

    // Subscribe to element updates
    this.elementsChannel = supabase
      .channel(`elements:${this.boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'board_elements',
          filter: `board_id=eq.${this.boardId}`,
        },
        () => {
          this.fetchElements();
        }
      )
      .subscribe();

    // Initial fetch
    await this.fetchCursors();
    await this.fetchElements();
  }

  // Update cursor position
  async updateCursor(x: number, y: number) {
    const { error } = await supabase
      .from('user_cursors')
      .upsert({
        board_id: this.boardId,
        user_id: this.userId,
        x,
        y,
      });

    if (error) {
      console.error('Error updating cursor:', error);
    }
  }

  // Fetch all cursors for the board
  private async fetchCursors() {
    const { data, error } = await supabase
      .from('user_cursors')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          avatar_url
        )
      `)
      .eq('board_id', this.boardId)
      .neq('user_id', this.userId); // Exclude current user's cursor

    if (error) {
      console.error('Error fetching cursors:', error);
      return;
    }

    const cursors: CursorPosition[] = (data || []).map((cursor: any) => ({
      x: cursor.x,
      y: cursor.y,
      user: {
        id: cursor.profiles.id,
        name: cursor.profiles.name,
        avatar_url: cursor.profiles.avatar_url,
      },
    }));

    this.onCursorsUpdate?.(cursors);
  }

  // Fetch all elements for the board
  private async fetchElements() {
    const { data, error } = await supabase
      .from('board_elements')
      .select('*')
      .eq('board_id', this.boardId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching elements:', error);
      return;
    }

    this.onElementsUpdate?.(data || []);
  }

  // Clean up subscriptions
  cleanup() {
    if (this.cursorsChannel) {
      supabase.removeChannel(this.cursorsChannel);
    }
    if (this.elementsChannel) {
      supabase.removeChannel(this.elementsChannel);
    }

    // Remove user's cursor when leaving
    supabase
      .from('user_cursors')
      .delete()
      .eq('board_id', this.boardId)
      .eq('user_id', this.userId)
      .then();
  }
}