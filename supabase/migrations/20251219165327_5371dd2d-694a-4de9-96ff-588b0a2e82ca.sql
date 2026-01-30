-- Add user_id column to multi-tenant tables
ALTER TABLE contacts ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE deals ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE interactions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE deal_analyses ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Assign existing data to your account
UPDATE contacts SET user_id = '4fc9a5a5-89b7-414d-a0d3-c11ce3d3aa55' WHERE user_id IS NULL;
UPDATE deals SET user_id = '4fc9a5a5-89b7-414d-a0d3-c11ce3d3aa55' WHERE user_id IS NULL;
UPDATE interactions SET user_id = '4fc9a5a5-89b7-414d-a0d3-c11ce3d3aa55' WHERE user_id IS NULL;
UPDATE deal_analyses SET user_id = '4fc9a5a5-89b7-414d-a0d3-c11ce3d3aa55' WHERE user_id IS NULL;

-- Set user_id to NOT NULL
ALTER TABLE contacts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE deals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE interactions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE deal_analyses ALTER COLUMN user_id SET NOT NULL;

-- Drop old RLS policies for contacts
DROP POLICY IF EXISTS "Authenticated users can read contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON contacts;

-- Create new user-scoped RLS policies for contacts
CREATE POLICY "Users can read own contacts" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON contacts FOR DELETE USING (auth.uid() = user_id);

-- Drop old RLS policies for deals
DROP POLICY IF EXISTS "Authenticated users can read deals" ON deals;
DROP POLICY IF EXISTS "Authenticated users can insert deals" ON deals;
DROP POLICY IF EXISTS "Authenticated users can update deals" ON deals;
DROP POLICY IF EXISTS "Authenticated users can delete deals" ON deals;

-- Create new user-scoped RLS policies for deals
CREATE POLICY "Users can read own deals" ON deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deals" ON deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deals" ON deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deals" ON deals FOR DELETE USING (auth.uid() = user_id);

-- Drop old RLS policies for interactions
DROP POLICY IF EXISTS "Authenticated users can read interactions" ON interactions;
DROP POLICY IF EXISTS "Authenticated users can insert interactions" ON interactions;
DROP POLICY IF EXISTS "Authenticated users can update interactions" ON interactions;
DROP POLICY IF EXISTS "Authenticated users can delete interactions" ON interactions;

-- Create new user-scoped RLS policies for interactions
CREATE POLICY "Users can read own interactions" ON interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interactions" ON interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interactions" ON interactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own interactions" ON interactions FOR DELETE USING (auth.uid() = user_id);

-- Drop old RLS policies for deal_analyses
DROP POLICY IF EXISTS "Authenticated users can read deal analyses" ON deal_analyses;
DROP POLICY IF EXISTS "Authenticated users can insert deal analyses" ON deal_analyses;
DROP POLICY IF EXISTS "Authenticated users can update deal analyses" ON deal_analyses;
DROP POLICY IF EXISTS "Authenticated users can delete deal analyses" ON deal_analyses;

-- Create new user-scoped RLS policies for deal_analyses
CREATE POLICY "Users can read own deal analyses" ON deal_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deal analyses" ON deal_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deal analyses" ON deal_analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deal analyses" ON deal_analyses FOR DELETE USING (auth.uid() = user_id);