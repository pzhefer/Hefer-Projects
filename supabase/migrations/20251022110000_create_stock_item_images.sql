/*
  # Create Stock Item Images System

  1. New Tables
    - `stock_item_images`
      - `id` (uuid, primary key)
      - `item_id` (uuid, foreign key to stock_items)
      - `file_name` (text) - Original filename
      - `file_path` (text) - Path in storage
      - `file_size` (bigint) - Size in bytes
      - `mime_type` (text) - Image MIME type
      - `caption` (text) - Optional image caption
      - `is_primary` (boolean) - Whether this is the primary image
      - `display_order` (integer) - Order for display
      - `uploaded_by` (uuid, foreign key to user_profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage
    - Create 'stock-item-images' bucket for storing images

  3. Security
    - Enable RLS on `stock_item_images` table
    - Add policies for authenticated users with stock module access
    - Configure storage policies for authenticated users

  4. Notes
    - Each item can have multiple images
    - One image can be marked as primary
    - Images are ordered by display_order
*/

-- Create stock_item_images table
CREATE TABLE IF NOT EXISTS stock_item_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  caption text,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  uploaded_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_item_images_item_id ON stock_item_images(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_item_images_is_primary ON stock_item_images(is_primary);

-- Enable RLS
ALTER TABLE stock_item_images ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with stock access to view images
CREATE POLICY "Users with stock access can view item images"
  ON stock_item_images
  FOR SELECT
  TO authenticated
  USING (
    user_can_access_module(auth.uid(), 'stock')
  );

-- Allow authenticated users with stock access to upload images
CREATE POLICY "Users with stock access can upload item images"
  ON stock_item_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_module(auth.uid(), 'stock')
  );

-- Allow authenticated users with stock access to update images
CREATE POLICY "Users with stock access can update item images"
  ON stock_item_images
  FOR UPDATE
  TO authenticated
  USING (
    user_can_access_module(auth.uid(), 'stock')
  )
  WITH CHECK (
    user_can_access_module(auth.uid(), 'stock')
  );

-- Allow authenticated users with stock access to delete images
CREATE POLICY "Users with stock access can delete item images"
  ON stock_item_images
  FOR DELETE
  TO authenticated
  USING (
    user_can_access_module(auth.uid(), 'stock')
  );

-- Create storage bucket for stock item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('stock-item-images', 'stock-item-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for stock item images
CREATE POLICY "Authenticated users can view stock item images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'stock-item-images');

CREATE POLICY "Authenticated users can upload stock item images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'stock-item-images');

CREATE POLICY "Authenticated users can update stock item images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'stock-item-images');

CREATE POLICY "Authenticated users can delete stock item images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'stock-item-images');
