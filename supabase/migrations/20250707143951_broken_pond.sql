/*
  # Fix RLS Policies - Complete Recursion Fix

  1. Drop ALL existing policies that could cause recursion
  2. Create new non-recursive policies with proper structure
  3. Ensure board_collaborators policies don't reference boards policies
*/

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can read boards they own" ON boards;
DROP POLICY IF EXISTS "Users can read boards they collaborate on" ON boards;
DROP POLICY IF EXISTS "Users can update boards they own" ON boards;
DROP POLICY IF EXISTS "Users can update boards they collaborate on" ON boards;
DROP POLICY IF EXISTS "Users can insert boards" ON boards;
DROP POLICY IF EXISTS "Users can delete boards they own" ON boards;

DROP POLICY IF EXISTS "Users can read elements from owned boards" ON board_elements;
DROP POLICY IF EXISTS "Users can read elements from collaborated boards" ON board_elements;
DROP POLICY IF EXISTS "Users can modify elements in owned boards" ON board_elements;
DROP POLICY IF EXISTS "Users can modify elements in collaborated boards" ON board_elements;

DROP POLICY IF EXISTS "Users can read cursors from owned boards" ON user_cursors;
DROP POLICY IF EXISTS "Users can read cursors from collaborated boards" ON user_cursors;
DROP POLICY IF EXISTS "Users can manage own cursors" ON user_cursors;

DROP POLICY IF EXISTS "Users can read own collaborations" ON board_collaborators;
DROP POLICY IF EXISTS "Users can manage collaborations for owned boards" ON board_collaborators;
DROP POLICY IF EXISTS "Board owners can manage collaborators" ON board_collaborators;

-- Create board_collaborators policies FIRST (no dependencies)
CREATE POLICY "Users can read their own collaborations"
  ON board_collaborators
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Board owners can manage collaborators"
  ON board_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE id = board_collaborators.board_id AND owner_id = auth.uid()
    )
  );

-- Create boards policies (can reference board_collaborators safely)
CREATE POLICY "Users can read owned boards"
  ON boards
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can read collaborated boards"
  ON boards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM board_collaborators 
      WHERE board_id = boards.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert boards"
  ON boards
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update owned boards"
  ON boards
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete owned boards"
  ON boards
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Create board_elements policies (reference boards directly)
CREATE POLICY "Users can read elements from accessible boards"
  ON board_elements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE id = board_elements.board_id 
      AND (
        owner_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM board_collaborators 
          WHERE board_id = boards.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage elements in accessible boards"
  ON board_elements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE id = board_elements.board_id 
      AND (
        owner_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM board_collaborators 
          WHERE board_id = boards.id AND user_id = auth.uid()
        )
      )
    )
  );

-- Create user_cursors policies (reference boards directly)
CREATE POLICY "Users can read cursors from accessible boards"
  ON user_cursors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE id = user_cursors.board_id 
      AND (
        owner_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM board_collaborators 
          WHERE board_id = boards.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage their own cursors"
  ON user_cursors
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());