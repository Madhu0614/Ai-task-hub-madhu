-- Migration: Create board_invites table for board invitation workflow
CREATE TABLE board_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  invited_user_id uuid REFERENCES user_list(id) ON DELETE CASCADE,
  inviter_user_id uuid REFERENCES user_list(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_board_invites_invited_user_id ON board_invites(invited_user_id);
CREATE INDEX idx_board_invites_board_id ON board_invites(board_id); 