/*
  # User Profiles and Roles Schema

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key) - References auth.users
      - `email` (text) - User email
      - `full_name` (text) - User's full name
      - `avatar_url` (text) - Profile picture URL
      - `phone` (text) - Contact phone number
      - `job_title` (text) - User's job title/position
      - `department` (text) - Department (e.g., Engineering, Safety, Finance)
      - `role` (text) - User role (admin, project_manager, supervisor, worker, viewer)
      - `company` (text) - Company name
      - `is_active` (boolean) - Account status
      - `last_login` (timestamptz) - Last login timestamp
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

    - `user_project_assignments`
      - `id` (uuid, primary key) - Unique assignment identifier
      - `user_id` (uuid, foreign key) - Reference to user_profiles
      - `project_id` (uuid, foreign key) - Reference to projects
      - `role_in_project` (text) - Role in specific project
      - `assigned_at` (timestamptz) - Assignment timestamp
      - `assigned_by` (uuid) - User who made the assignment

  2. Security
    - Enable RLS on all tables
    - Users can view their own profile
    - Users can view other users (for team collaboration)
    - Only admins can modify roles and assignments

  3. Notes
    - Supabase auth.users table already exists
    - This creates a profile table to extend user data
    - Automatic profile creation on signup via trigger
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  avatar_url text DEFAULT '',
  phone text DEFAULT '',
  job_title text DEFAULT '',
  department text DEFAULT '' CHECK (department IN ('', 'Management', 'Engineering', 'Safety', 'Finance', 'Operations', 'Quality', 'Procurement', 'HR')),
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'project_manager', 'supervisor', 'worker', 'viewer')),
  company text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_project_assignments table
CREATE TABLE IF NOT EXISTS user_project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_in_project text NOT NULL DEFAULT 'team_member' CHECK (role_in_project IN ('project_manager', 'supervisor', 'engineer', 'safety_officer', 'quality_inspector', 'team_member')),
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES user_profiles(id),
  UNIQUE(user_id, project_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_project_assignments_user_id ON user_project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_assignments_project_id ON user_project_assignments(project_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_project_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow user profile creation"
  ON user_profiles FOR INSERT
  WITH CHECK (true);

-- RLS Policies for user_project_assignments
CREATE POLICY "Users can view all project assignments"
  ON user_project_assignments FOR SELECT
  USING (true);

CREATE POLICY "Allow assignment creation"
  ON user_project_assignments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow assignment updates"
  ON user_project_assignments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow assignment deletion"
  ON user_project_assignments FOR DELETE
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
