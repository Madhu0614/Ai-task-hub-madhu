"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface RealtimeTestProps {
  boardId: string;
  userId: string;
  realtimeRef?: any; // Reference to the realtime collaboration instance
}

export default function RealtimeTest({ boardId, userId, realtimeRef }: RealtimeTestProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testRealtimeConnection = async () => {
    setTestStatus('testing');
    setTestResults([]);
    
    try {
      addTestResult('Starting real-time connection test...');
      
      // Test 1: Check if we can connect to Supabase
      addTestResult('Testing Supabase connection...');
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (testError) {
        throw new Error(`Supabase connection failed: ${testError.message}`);
      }
      addTestResult('✅ Supabase connection successful');

      // Test 2: Test cursor update
      addTestResult('Testing cursor position update...');
      const { error: cursorError } = await supabase
        .from('user_cursors')
        .upsert({
          board_id: boardId,
          user_id: userId,
          x: Math.random() * 1000,
          y: Math.random() * 1000,
        }, {
          onConflict: 'board_id,user_id'
        });

      if (cursorError) {
        throw new Error(`Cursor update failed: ${cursorError.message}`);
      }
      addTestResult('✅ Cursor position update successful');

      // Test 3: Test element creation
      addTestResult('Testing element creation...');
      const { error: elementError } = await supabase
        .from('board_elements')
        .insert({
          board_id: boardId,
          type: 'test',
          x: Math.random() * 1000,
          y: Math.random() * 1000,
          content: 'Test element',
        });

      if (elementError) {
        throw new Error(`Element creation failed: ${elementError.message}`);
      }
      addTestResult('✅ Element creation successful');

      // Test 4: Check active users
      addTestResult('Checking active users...');
      const { data: cursors, error: cursorsError } = await supabase
        .from('user_cursors')
        .select('user_id')
        .eq('board_id', boardId);

      if (cursorsError) {
        throw new Error(`Failed to fetch active users: ${cursorsError.message}`);
      }

      const uniqueUsers = new Set(cursors?.map(c => c.user_id) || []).size;
      setActiveUsers(uniqueUsers);
      addTestResult(`✅ Found ${uniqueUsers} active user(s)`);

      // Test 5: Check subscription status
      if (realtimeRef?.current) {
        const status = realtimeRef.current.getSubscriptionStatus();
        setSubscriptionStatus(status);
        addTestResult(`✅ Subscription status: Cursors=${status.cursorsChannel}, Elements=${status.elementsChannel}`);
      }

      addTestResult('🎉 All real-time tests passed!');
      setTestStatus('success');

    } catch (error) {
      addTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTestStatus('error');
    }
  };

  const testElementRealtime = async () => {
    if (!realtimeRef?.current) {
      addTestResult('❌ Realtime instance not available');
      return;
    }

    addTestResult('Testing element real-time updates...');
    
    // Test 1: Create element via realtime instance
    const success = await realtimeRef.current.testElementCreation();
    
    if (success) {
      addTestResult('✅ Test element created via realtime instance');
    } else {
      addTestResult('❌ Failed to create test element via realtime instance');
    }

    // Test 2: Create element directly via Supabase
    addTestResult('Testing direct Supabase element creation...');
    try {
      const { data, error } = await supabase
        .from('board_elements')
        .insert({
          board_id: boardId,
          type: 'test-direct',
          x: Math.random() * 1000,
          y: Math.random() * 1000,
          content: `Direct test element ${Date.now()}`,
        })
        .select('*')
        .single();

      if (error) {
        addTestResult(`❌ Direct element creation failed: ${error.message}`);
      } else {
        addTestResult('✅ Direct element created - check if real-time subscription catches it');
        console.log('Direct element created:', data);
      }
    } catch (error) {
      addTestResult(`❌ Direct element creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const cleanupTestData = async () => {
    try {
      // Remove test elements
      await supabase
        .from('board_elements')
        .delete()
        .eq('board_id', boardId)
        .eq('type', 'test');

      // Remove test cursors
      await supabase
        .from('user_cursors')
        .delete()
        .eq('board_id', boardId)
        .eq('user_id', userId);

      addTestResult('🧹 Test data cleaned up');
    } catch (error) {
      addTestResult(`❌ Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Card className="w-96">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Real-time Test
          <Badge variant={testStatus === 'success' ? 'default' : testStatus === 'error' ? 'destructive' : 'secondary'}>
            {testStatus === 'success' ? '✅ Working' : testStatus === 'error' ? '❌ Failed' : '⏳ Testing'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Button 
            onClick={testRealtimeConnection}
            disabled={testStatus === 'testing'}
            size="sm"
          >
            {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button 
            onClick={testElementRealtime}
            variant="outline"
            size="sm"
          >
            Test Element
          </Button>
          <Button 
            onClick={cleanupTestData}
            variant="outline"
            size="sm"
          >
            Cleanup
          </Button>
        </div>

        <div className="text-sm space-y-2">
          <div className="flex items-center space-x-2">
            <span>Active users:</span>
            <Badge variant="outline">{activeUsers}</Badge>
          </div>
          {subscriptionStatus && (
            <div className="flex items-center space-x-2">
              <span>Subscriptions:</span>
              <Badge variant={subscriptionStatus.cursorsChannel === 'active' ? 'default' : 'secondary'}>
                Cursors: {subscriptionStatus.cursorsChannel}
              </Badge>
              <Badge variant={subscriptionStatus.elementsChannel === 'active' ? 'default' : 'secondary'}>
                Elements: {subscriptionStatus.elementsChannel}
              </Badge>
            </div>
          )}
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1">
          {testResults.map((result, index) => (
            <div key={index} className="text-xs text-slate-600 font-mono">
              {result}
            </div>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          <p>This test will:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Check Supabase connection</li>
            <li>Test cursor position updates</li>
            <li>Test element creation</li>
            <li>Count active users</li>
            <li>Check subscription status</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 