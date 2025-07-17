import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface BoardElement {
  id: string;
  type: string;
  x: number;
  y: number;
  content?: string;
}

export default function RealtimeBoardElementsTable({ boardId }: { boardId: string }) {
  const [rows, setRows] = useState<BoardElement[]>([]);

  useEffect(() => {
    let isMounted = true;
    // Initial fetch
    supabase
      .from('board_elements')
      .select('id, type, x, y, content')
      .eq('board_id', boardId)
      .then(({ data }) => {
        if (isMounted && data) setRows(data);
      });

    // Subscribe to realtime changes via WebSocket
    const channel = supabase
      .channel(`realtime:board_elements:${boardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'board_elements', filter: `board_id=eq.${boardId}` },
        (payload) => {
          // For simplicity, refetch all rows on any change
          supabase
            .from('board_elements')
            .select('id, type, x, y, content')
            .eq('board_id', boardId)
            .then(({ data }) => {
              if (isMounted && data) setRows(data);
            });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [boardId]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">Type</th>
            <th className="border px-2 py-1">X</th>
            <th className="border px-2 py-1">Y</th>
            <th className="border px-2 py-1">Content</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="even:bg-slate-50">
              <td className="border px-2 py-1 font-mono text-xs">{row.id}</td>
              <td className="border px-2 py-1">{row.type}</td>
              <td className="border px-2 py-1">{row.x}</td>
              <td className="border px-2 py-1">{row.y}</td>
              <td className="border px-2 py-1">{row.content}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 