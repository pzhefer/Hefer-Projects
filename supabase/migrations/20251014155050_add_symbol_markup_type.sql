/*
  # Add Symbol Markup Type

  1. Changes
    - Add 'symbol' to the allowed markup_type values in drawing_markups table
    - This enables the new symbol library feature where users can place construction symbols on drawings
    - Symbol data (symbol_id, svg_path, view_box) will be stored in the jsonb 'data' column

  2. Notes
    - Non-destructive change - only expands allowed values
    - All existing markup data remains valid
*/

-- Drop the existing constraint
ALTER TABLE drawing_markups 
  DROP CONSTRAINT IF EXISTS drawing_markups_markup_type_check;

-- Add new constraint with 'symbol' included
ALTER TABLE drawing_markups
  ADD CONSTRAINT drawing_markups_markup_type_check 
  CHECK (markup_type IN (
    'select',
    'pan', 
    'zoom-area',
    'pen',
    'highlighter',
    'line',
    'multiline',
    'arrow',
    'rectangle',
    'circle',
    'ellipse',
    'triangle',
    'polygon',
    'cloud',
    'text',
    'dimension',
    'issue',
    'photo',
    'measurement',
    'symbol'
  ));
