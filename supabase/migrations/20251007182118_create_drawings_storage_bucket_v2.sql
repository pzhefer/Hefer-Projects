/*
  # Create Drawings Storage Bucket

  1. Storage Bucket
    - Create a bucket named 'drawings' for storing drawing files
    - Configure appropriate size limits and allowed file types
    
  2. Storage Policies
    - Authenticated users can upload drawings
    - Authenticated users can view drawings
    - Users can only delete their own uploaded drawings
    
  3. Security
    - All operations require authentication
    - File size and type restrictions enforced
*/

-- Create storage bucket for drawings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'drawings',
  'drawings',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/vnd.dwg',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can view drawings
CREATE POLICY "Authenticated users can view drawings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'drawings');

-- Policy: Authenticated users can upload drawings
CREATE POLICY "Authenticated users can upload drawings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'drawings');

-- Policy: Users can update their own drawings metadata
CREATE POLICY "Users can update their own drawings"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'drawings' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'drawings' AND auth.uid() = owner);

-- Policy: Users can delete their own drawings
CREATE POLICY "Users can delete their own drawings"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'drawings' AND auth.uid() = owner);
