/*
  # Expand Drawing Markup Types
  
  This migration expands the allowed markup types in the drawing_markups table to support
  all annotation tools available in the drawing viewers.
  
  ## Changes
  
  1. Additional Markup Types Added:
    - `select` - Selection tool (used for mode tracking)
    - `pan` - Pan/move tool (used for mode tracking)
    - `zoom-area` - Zoom area selection tool
    - `multiline` - Multi-segment line drawing
    - `ellipse` - Ellipse/oval shapes
    - `triangle` - Triangle shapes
    - `polygon` - Multi-point polygon shapes
    - `dimension` - Measurement/dimension annotations
    - `issue` - Issue/comment markers
    - `highlighter` - Semi-transparent highlighting tool
  
  2. Existing Types Maintained:
    - `pen` - Freehand drawing
    - `line` - Straight line
    - `arrow` - Arrow annotation
    - `rectangle` - Rectangle shapes
    - `circle` - Circle shapes
    - `cloud` - Cloud callout shapes
    - `text` - Text annotations
    - `photo` - Photo attachments
    - `measurement` - Legacy measurement type
  
  ## Notes
  - This is a non-destructive change that only expands allowed values
  - All existing markup data remains valid
*/

-- Drop the existing constraint
ALTER TABLE drawing_markups 
  DROP CONSTRAINT IF EXISTS drawing_markups_markup_type_check;

-- Add new constraint with expanded types
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
    'measurement'
  ));
