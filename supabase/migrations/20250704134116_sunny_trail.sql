/*
  # Fix RLS Policies - Remove Infinite Recursion

  1. Drop existing problematic policies
  2. Create new simplified policies without circular references
  3. Ensure proper access control without recursion
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can read own boards" ON boards;
DROP POLICY IF EXISTS "Users can update own boards" ON boards;
DROP POLICY IF EXISTS "Users can read board elements" ON board_elements;
DROP POLICY IF EXISTS "Users can modify board elements" ON board_elements;
DROP POLICY IF EXISTS "Users can read cursors for accessible boards" ON user_cursors;

-- Create new simplified policies without recursion

-- Boards policies (simplified to avoid recursion)
CREATE POLICY "Users can read boards they own"
  ON boards
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can read boards they collaborate on"
  ON boards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM board_collaborators 
      WHERE board_id = boards.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update boards they own"
  ON boards
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can update boards they collaborate on"
  ON boards
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM board_collaborators 
      WHERE board_id = boards.id AND user_id = auth.uid()
    )
  );

-- Board elements policies (simplified)
CREATE POLICY "Users can read elements from owned boards"
  ON board_elements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE id = board_elements.board_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can read elements from collaborated boards"
  ON board_elements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM board_collaborators 
      WHERE board_id = board_elements.board_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can modify elements in owned boards"
  ON board_elements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE id = board_elements.board_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can modify elements in collaborated boards"
  ON board_elements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM board_collaborators 
      WHERE board_id = board_elements.board_id AND user_id = auth.uid()
    )
  );

-- User cursors policies (simplified)
CREATE POLICY "Users can read cursors from owned boards"
  ON user_cursors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE id = user_cursors.board_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can read cursors from collaborated boards"
  ON user_cursors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM board_collaborators 
      WHERE board_id = user_cursors.board_id AND user_id = auth.uid()
    )
  );