"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface RealtimeDiagnosticsProps {
  boardId: string;
}

export default function RealtimeDiagnostics({ boardId }: RealtimeDiagnosticsProps) {
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: any = {};

    try {
      // Test 1: Check if we can read from the tables
      console.log('Testing table access...');
      
      const { data: cursorsData, error: cursorsError } = await supabase
        .from('user_cursors')
        .select('count')
        .eq('board_id', boardId);

      results.cursorsReadable = !cursorsError;
      results.cursorsError = cursorsError?.message;

      const { data: elementsData, error: elementsError } = await supabase
        .from('board_elements')
        .select('count')
        .eq('board_id', boardId);

      results.elementsReadable = !elementsError;
      results.elementsError = elementsError?.message;

      // Test 2: Check if we can write to the tables
      console.log('Testing table writes...');
      
      // Get the current user ID first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const testCursor = {
        board_id: boardId,
        user_id: user.id, // Use actual user ID instead of 'test-user'
        x: 100,
        y: 100,
      };

      const { error: cursorWriteError } = await supabase
        .from('user_cursors')
        .upsert(testCursor, { onConflict: 'board_id,user_id' });

      results.cursorsWritable = !cursorWriteError;
      results.cursorsWriteError = cursorWriteError?.message;

      const testElement = {
        board_id: boardId,
        type: 'diagnostic',
        x: 100,
        y: 100,
        content: 'Diagnostic test',
      };

      const { error: elementWriteError } = await supabase
        .from('board_elements')
        .insert(testElement);

      results.elementsWritable = !elementWriteError;
      results.elementsWriteError = elementWriteError?.message;

      // Test 3: Check Supabase configuration
      results.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing';
      results.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing';

      // Test 4: Check if we're authenticated
      results.authenticated = !!user;
      results.userId = user?.id;

      // Clean up test data
      await supabase
        .from('user_cursors')
        .delete()
        .eq('board_id', boardId)
        .eq('user_id', user.id); // Use actual user ID

      await supabase
        .from('board_elements')
        .delete()
        .eq('board_id', boardId)
        .eq('type', 'diagnostic');

    } catch (error) {
      results.error = error instanceof Error ? error.message : 'Unknown error';
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  return (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Real-time Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics}
          disabled={isRunning}
          size="sm"
        >
          {isRunning ? 'Running...' : 'Run Diagnostics'}
        </Button>

        {Object.keys(diagnostics).length > 0 && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>Supabase URL:</div>
              <Badge variant={diagnostics.supabaseUrl === 'Set' ? 'default' : 'destructive'}>
                {diagnostics.supabaseUrl}
              </Badge>
              
              <div>Supabase Key:</div>
              <Badge variant={diagnostics.supabaseKey === 'Set' ? 'default' : 'destructive'}>
                {diagnostics.supabaseKey}
              </Badge>
              
              <div>Authenticated:</div>
              <Badge variant={diagnostics.authenticated ? 'default' : 'destructive'}>
                {diagnostics.authenticated ? 'Yes' : 'No'}
              </Badge>
              
              <div>Cursors Readable:</div>
              <Badge variant={diagnostics.cursorsReadable ? 'default' : 'destructive'}>
                {diagnostics.cursorsReadable ? 'Yes' : 'No'}
              </Badge>
              
              <div>Cursors Writable:</div>
              <Badge variant={diagnostics.cursorsWritable ? 'default' : 'destructive'}>
                {diagnostics.cursorsWritable ? 'Yes' : 'No'}
              </Badge>
              
              <div>Elements Readable:</div>
              <Badge variant={diagnostics.elementsReadable ? 'default' : 'destructive'}>
                {diagnostics.elementsReadable ? 'Yes' : 'No'}
              </Badge>
              
              <div>Elements Writable:</div>
              <Badge variant={diagnostics.elementsWritable ? 'default' : 'destructive'}>
                {diagnostics.elementsWritable ? 'Yes' : 'No'}
              </Badge>
            </div>

            {diagnostics.error && (
              <div className="text-red-600 text-xs">
                Error: {diagnostics.error}
              </div>
            )}

            {diagnostics.cursorsError && (
              <div className="text-red-600 text-xs">
                Cursors Error: {diagnostics.cursorsError}
              </div>
            )}

            {diagnostics.elementsError && (
              <div className="text-red-600 text-xs">
                Elements Error: {diagnostics.elementsError}
              </div>
            )}

            {diagnostics.cursorsWriteError && (
              <div className="text-red-600 text-xs">
                Cursors Write Error: {diagnostics.cursorsWriteError}
              </div>
            )}

            {diagnostics.elementsWriteError && (
              <div className="text-red-600 text-xs">
                Elements Write Error: {diagnostics.elementsWriteError}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-slate-500">
          <p>This will test:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Environment variables</li>
            <li>Authentication status</li>
            <li>Table read/write permissions</li>
            <li>RLS policy access</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 