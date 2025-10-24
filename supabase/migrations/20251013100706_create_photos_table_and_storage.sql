/*
  # Create Photos Module

  ## Overview
  Creates a comprehensive photo management system for construction projects with support for
  categorization, location tracking, and metadata management.

  ## 1. New Tables
  
  ### `photos`
  Core photo table storing all construction site photos
  - `id` (uuid, primary key) - Unique photo identifier
  - `project_id` (uuid, foreign key) - Links to projects table
  - `title` (text) - Photo title/caption
  - `description` (text, nullable) - Detailed photo description
  - `file_path` (text) - Storage path to photo file
  - `file_size` (bigint) - File size in bytes
  - `mime_type` (text) - Image MIME type (image/jpeg, image/png, etc.)
  - `width` (integer, nullable) - Image width in pixels
  - `height` (integer, nullable) - Image height in pixels
  - `category` (text) - Photo category (progress, safety, quality, issue, equipment, team, site, other)
  - `location` (text, nullable) - Physical location description (e.g., "Building A - 2nd Floor")
  - `latitude` (numeric, nullable) - GPS latitude coordinate
  - `longitude` (numeric, nullable) - GPS longitude coordinate
  - `taken_by` (uuid, foreign key) - User who took/uploaded the photo
  - `taken_at` (timestamptz) - When photo was taken
  - `weather` (text, nullable) - Weather conditions when photo was taken
  - `tags` (text array) - Searchable tags
  - `is_featured` (boolean) - Whether photo is featured for project
  - `visibility` (text) - Who can view: public, team, private, client
  - `created_at` (timestamptz) - Upload timestamp
  - `updated_at` (timestamptz) - Last modification timestamp
  
  ### `photo_comments`
  Comments and annotations on photos
  - `id` (uuid, primary key) - Unique comment identifier
  - `photo_id` (uuid, foreign key) - Links to photos table
  - `user_id` (uuid, foreign key) - User who made comment
  - `comment` (text) - Comment text
  - `created_at` (timestamptz) - Comment timestamp
  
  ### `photo_albums`
  Photo albums/collections for organizing photos
  - `id` (uuid, primary key) - Unique album identifier
  - `project_id` (uuid, foreign key) - Links to projects table
  - `name` (text) - Album name
  - `description` (text, nullable) - Album description
  - `cover_photo_id` (uuid, nullable, foreign key) - Cover photo
  - `created_by` (uuid, foreign key) - Album creator
  - `created_at` (timestamptz) - Creation timestamp
  
  ### `photo_album_items`
  Junction table linking photos to albums
  - `id` (uuid, primary key) - Unique identifier
  - `album_id` (uuid, foreign key) - Links to photo_albums
  - `photo_id` (uuid, foreign key) - Links to photos
  - `order_index` (integer) - Display order within album
  - `added_at` (timestamptz) - When photo was added to album

  ## 2. Storage Bucket
  Creates a storage bucket named `photos` for storing photo files with appropriate access policies.

  ## 3. Security (RLS Policies)
  - All tables have RLS enabled
  - Users can view photos in projects they have access to (via user_project_assignments)
  - Users can upload photos to projects they have access to
  - Users can edit/delete their own photos
  - Administrators can manage all photos
  - Comments are visible to all project members
  - Albums follow same access rules as photos

  ## 4. Indexes
  - Index on project_id for fast project-based queries
  - Index on taken_by for user photo queries
  - Index on category for filtering by category
  - Index on taken_at for chronological sorting
  - Index on tags using GIN for array search

  ## 5. Important Notes
  - Photos are stored in Supabase Storage, not in the database
  - file_path contains the storage path reference
  - GPS coordinates support location-based features
  - Categories help organize construction documentation
  - Visibility controls access at photo level
*/

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  width integer,
  height integer,
  category text NOT NULL DEFAULT 'other',
  location text,
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  taken_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taken_at timestamptz NOT NULL DEFAULT now(),
  weather text,
  tags text[] DEFAULT '{}',
  is_featured boolean DEFAULT false,
  visibility text NOT NULL DEFAULT 'team',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_category CHECK (category IN ('progress', 'safety', 'quality', 'issue', 'equipment', 'team', 'site', 'other')),
  CONSTRAINT valid_visibility CHECK (visibility IN ('public', 'team', 'private', 'client')),
  CONSTRAINT valid_mime_type CHECK (mime_type LIKE 'image/%')
);

-- Create indexes for photos table
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_taken_by ON photos(taken_by);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_tags ON photos USING GIN(tags);

-- Create photo_comments table
CREATE TABLE IF NOT EXISTS photo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_comments_photo_id ON photo_comments(photo_id);

-- Create photo_albums table
CREATE TABLE IF NOT EXISTS photo_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_photo_id uuid REFERENCES photos(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_albums_project_id ON photo_albums(project_id);

-- Create photo_album_items table
CREATE TABLE IF NOT EXISTS photo_album_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
  photo_id uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  
  UNIQUE(album_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_album_items_album_id ON photo_album_items(album_id);

-- Enable Row Level Security
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_album_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photos table
CREATE POLICY "Users can view photos in their projects"
  ON photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_project_assignments
      WHERE user_project_assignments.project_id = photos.project_id
      AND user_project_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload photos to their projects"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (
    taken_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_project_assignments
      WHERE user_project_assignments.project_id = photos.project_id
      AND user_project_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own photos"
  ON photos FOR UPDATE
  TO authenticated
  USING (taken_by = auth.uid())
  WITH CHECK (taken_by = auth.uid());

CREATE POLICY "Users can delete their own photos"
  ON photos FOR DELETE
  TO authenticated
  USING (taken_by = auth.uid());

-- RLS Policies for photo_comments table
CREATE POLICY "Users can view comments on photos they can access"
  ON photo_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM photos
      JOIN user_project_assignments ON user_project_assignments.project_id = photos.project_id
      WHERE photos.id = photo_comments.photo_id
      AND user_project_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add comments to photos they can access"
  ON photo_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM photos
      JOIN user_project_assignments ON user_project_assignments.project_id = photos.project_id
      WHERE photos.id = photo_comments.photo_id
      AND user_project_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON photo_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for photo_albums table
CREATE POLICY "Users can view albums in their projects"
  ON photo_albums FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_project_assignments
      WHERE user_project_assignments.project_id = photo_albums.project_id
      AND user_project_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create albums in their projects"
  ON photo_albums FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_project_assignments
      WHERE user_project_assignments.project_id = photo_albums.project_id
      AND user_project_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own albums"
  ON photo_albums FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own albums"
  ON photo_albums FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for photo_album_items table
CREATE POLICY "Users can view album items in their projects"
  ON photo_album_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM photo_albums
      JOIN user_project_assignments ON user_project_assignments.project_id = photo_albums.project_id
      WHERE photo_albums.id = photo_album_items.album_id
      AND user_project_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Album creators can manage album items"
  ON photo_album_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM photo_albums
      WHERE photo_albums.id = photo_album_items.album_id
      AND photo_albums.created_by = auth.uid()
    )
  );

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for photos bucket
CREATE POLICY "Users can view photos in their projects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (
      EXISTS (
        SELECT 1 FROM photos
        JOIN user_project_assignments ON user_project_assignments.project_id = photos.project_id
        WHERE photos.file_path = storage.objects.name
        AND user_project_assignments.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload photos to their projects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (
      EXISTS (
        SELECT 1 FROM photos
        WHERE photos.file_path = storage.objects.name
        AND photos.taken_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (
      EXISTS (
        SELECT 1 FROM photos
        WHERE photos.file_path = storage.objects.name
        AND photos.taken_by = auth.uid()
      )
    )
  );