/*
  # Authentication and Boards Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `name` (text)
      - `avatar_url` (text, optional)
      - `team` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `boards`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text)
      - `owner_id` (uuid, references profiles)
      - `starred` (boolean)
      - `thumbnail` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `board_elements`
      - `id` (uuid, primary key)
      - `board_id` (uuid, references boards)
      - `type` (text)
      - `x` (numeric)
      - `y` (numeric)
      - `width` (numeric, optional)
      - `height` (numeric, optional)
      - `content` (text, optional)
      - `color` (text, optional)
      - `stroke_width` (numeric, optional)
      - `points` (jsonb, optional)
      - `rotation` (numeric, default 0)
      - `locked` (boolean, default false)
      - `kanban_data` (jsonb, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `board_collaborators`
      - `id` (uuid, primary key)
      - `board_id` (uuid, references boards)
      - `user_id` (uuid, references profiles)
      - `role` (text, default 'editor')
      - `created_at` (timestamp)
    
    - `user_cursors`
      - `id` (uuid, primary key)
      - `board_id` (uuid, references boards)
      - `user_id` (uuid, references profiles)
      - `x` (numeric)
      - `y` (numeric)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  avatar_url text,
  team text DEFAULT 'Personal',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create boards table
CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'blank',
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  starred boolean DEFAULT false,
  thumbnail text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create board_elements table
CREATE TABLE IF NOT EXISTS board_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  x numeric NOT NULL,
  y numeric NOT NULL,
  width numeric,
  height numeric,
  content text,
  color text,
  stroke_width numeric,
  points jsonb,
  rotation numeric DEFAULT 0,
  locked boolean DEFAULT false,
  kanban_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create board_collaborators table
CREATE TABLE IF NOT EXISTS board_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'editor',
  created_at timestamptz DEFAULT now(),
  UNIQUE(board_id, user_id)
);

-- Create user_cursors table for real-time collaboration
CREATE TABLE IF NOT EXISTS user_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  x numeric NOT NULL,
  y numeric NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(board_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cursors ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Boards policies
CREATE POLICY "Users can read own boards"
  ON boards
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR 
    id IN (
      SELECT board_id FROM board_collaborators 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create boards"
  ON boards
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own boards"
  ON boards
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR 
    id IN (
      SELECT board_id FROM board_collaborators 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own boards"
  ON boards
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Board elements policies
CREATE POLICY "Users can read board elements"
  ON board_elements
  FOR SELECT
  TO authenticated
  USING (
    board_id IN (
      SELECT id FROM boards 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT board_id FROM board_collaborators 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can modify board elements"
  ON board_elements
  FOR ALL
  TO authenticated
  USING (
    board_id IN (
      SELECT id FROM boards 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT board_id FROM board_collaborators 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Board collaborators policies
CREATE POLICY "Users can read board collaborators"
  ON board_collaborators
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    board_id IN (
      SELECT id FROM boards WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Board owners can manage collaborators"
  ON board_collaborators
  FOR ALL
  TO authenticated
  USING (
    board_id IN (
      SELECT id FROM boards WHERE owner_id = auth.uid()
    )
  );

-- User cursors policies
CREATE POLICY "Users can read cursors for accessible boards"
  ON user_cursors
  FOR SELECT
  TO authenticated
  USING (
    board_id IN (
      SELECT id FROM boards 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT board_id FROM board_collaborators 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own cursor"
  ON user_cursors
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_boards_owner_id ON boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_board_elements_board_id ON board_elements(board_id);
CREATE INDEX IF NOT EXISTS idx_board_collaborators_board_id ON board_collaborators(board_id);
CREATE INDEX IF NOT EXISTS idx_board_collaborators_user_id ON board_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cursors_board_id ON user_cursors(board_id);

-- Create function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at
  BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_elements_updated_at
  BEFORE UPDATE ON board_elements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_cursors_updated_at
  BEFORE UPDATE ON user_cursors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();