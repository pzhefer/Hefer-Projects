/*
  # Add Hierarchical Structure to Bins

  ## Overview
  Adds parent-child relationships to stock_bins table to enable hierarchical organization
  similar to categories (e.g., Warehouse > Aisle A > Shelf 1 > Bin A1-01).

  ## Changes

  ### Modified Tables

  #### `stock_bins`
  - `parent_id` (uuid) - Optional reference to parent bin for hierarchy
  - Creates self-referencing foreign key relationship
  - Enables unlimited nesting levels

  ## Benefits
  - Better organization of complex warehouses with multiple levels
  - Clear visual hierarchy in UI (aisles, shelves, sections, bins)
  - Flexible to accommodate any warehouse layout
  - Consistent with category hierarchy pattern

  ## Notes
  - All existing bins will have NULL parent_id (top-level)
  - Parent bin must exist in the same store
  - Cascading deletes: removing a parent will also remove all children
*/

-- Add parent_id column to stock_bins for hierarchical structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_bins' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE stock_bins 
    ADD COLUMN parent_id uuid REFERENCES stock_bins(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_stock_bins_parent_id ON stock_bins(parent_id);

-- Add a check constraint to prevent circular references at the database level
-- This prevents a bin from being its own parent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'stock_bins_no_self_reference'
  ) THEN
    ALTER TABLE stock_bins 
    ADD CONSTRAINT stock_bins_no_self_reference 
    CHECK (id != parent_id);
  END IF;
END $$;