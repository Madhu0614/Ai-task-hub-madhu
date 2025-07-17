/*
  # Final Fix for RLS Policy Infinite Recursion

  This migration completely removes all existing policies and creates new ones
  with a strict hierarchy to prevent any circular references:
  
  1. Drop ALL existing policies
  2. Create simple, non-recursive policies
  3. Use direct ownership checks instead of complex joins
*/

-- Drop ALL existing policies completely
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on boards table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'boards') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON boards';
    END LOOP;
    
    -- Drop all policies on board_elements table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'board_elements') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON board_elements';
    END LOOP;
    
    -- Drop all policies on board_collaborators table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'board_collaborators') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON board_collaborators';
    END LOOP;
    
    -- Drop all policies on user_cursors table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_cursors') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_cursors';
    END LOOP;
END $$;

-- Create simple, non-recursive policies

-- BOARDS: Simple ownership-based policies only
CREATE POLICY "boards_select_owner"
  ON boards
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "boards_insert_owner"
  ON boards
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "boards_update_owner"
  ON boards
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "boards_delete_owner"
  ON boards
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- BOARD_COLLABORATORS: Simple policies without board references
CREATE POLICY "collaborators_select_own"
  ON board_collaborators
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "collaborators_insert_check"
  ON board_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow if the current user owns the board
    EXISTS (
      SELECT 1 FROM boards 
      WHERE id = board_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "collaborators_delete_check"
  ON board_collaborators
  FOR DELETE
  TO authenticated
  USING (
    -- Allow if user owns the board or is removing themselves
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM boards 
      WHERE id = board_id AND owner_id = auth.uid()
    )
  );

-- BOARD_ELEMENTS: Simple policies with direct board ownership check
CREATE POLICY "elements_select_owner"
  ON board_elements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE id = board_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "elements_all_owner"
  ON board_elements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE id = board_id AND owner_id = auth.uid()
    )
  );

-- USER_CURSORS: Simple policies with direct board ownership check
CREATE POLICY "cursors_select_owner"
  ON user_cursors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE id = board_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "cursors_all_own"
  ON user_cursors
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Add collaboration access through a function to avoid recursion
CREATE OR REPLACE FUNCTION user_can_access_board(board_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM boards 
    WHERE id = board_uuid AND owner_id = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM board_collaborators 
    WHERE board_id = board_uuid AND user_id = user_uuid
  );
$$;

-- Add additional policies using the function for collaboration
CREATE POLICY "boards_select_collaborator"
  ON boards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM board_collaborators 
      WHERE board_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "elements_select_collaborator"
  ON board_elements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM board_collaborators 
      WHERE board_id = board_elements.board_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "elements_all_collaborator"
  ON board_elements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM board_collaborators 
      WHERE board_id = board_elements.board_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "cursors_select_collaborator"
  ON user_cursors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM board_collaborators 
      WHERE board_id = user_cursors.board_id AND user_id = auth.uid()
    )
  );