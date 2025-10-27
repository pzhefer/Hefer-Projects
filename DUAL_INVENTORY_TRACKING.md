# Dual Inventory Tracking System

## Overview

The stock management system now supports two distinct inventory tracking methods:

1. **Serialized Tracking**: Individual asset tracking with unique serial numbers
2. **Bulk Tracking**: Quantity-based tracking for non-serialized items

## Database Schema

### New Table: `stock_serialized_items`

Tracks individual serialized items with the following fields:

- `id`: Unique identifier for each serialized unit
- `item_id`: Links to parent item in `stock_items`
- `serial_number`: Unique serial/asset number (required, unique)
- `location_id`: Current physical location
- `condition`: excellent, good, fair, poor, damaged
- `status`: available, in_use, on_hire, maintenance, retired, disposed
- `purchase_date`: When this specific unit was purchased
- `purchase_cost`: Cost of this specific unit
- `warranty_expiry`: Warranty expiration date
- `last_service_date`: Last maintenance date
- `next_service_date`: Next scheduled service
- `notes`: Unit-specific notes

### Updated: `stock_items` Table

Added `is_serialized` boolean flag:
- `true`: Item uses serialized tracking (individual units)
- `false`: Item uses bulk tracking (quantities)

### View: `stock_item_quantities`

Unified view that automatically calculates quantities for both tracking methods:
- Serialized items: COUNT of units in `stock_serialized_items`
- Non-serialized items: SUM of quantities in `stock_quantities`

## Features

### Stock Dashboard

The main Stock page now displays:

- **Total Items**: Overall count of different item types
- **Serialized Items**: Count of items tracked by serial number
  - Shows total serialized units across all items
- **Bulk Items**: Count of items tracked by quantity
- **On Hire**: Items currently checked out
- **Overdue**: Items past their return date
- **Low Stock**: Items below reorder point
- **Total Value**: Aggregate replacement cost

### Stock Items Manager

#### List View Features

- **Quantity Column**: Shows current quantity for all items
  - Serialized items: Clickable count (e.g., "5 units") that opens the serialized items manager
  - Non-serialized items: Regular quantity number
- **Visual Indicators**: Hash icon (🔗) marks serialized items
- **Serial Number Management**: Quick access button to manage individual units

#### Add/Edit Item Form

New checkbox option: **"Track by Serial Number"**
- Enable for items requiring individual tracking (equipment, tools, assets)
- Disable for bulk items (consumables, parts, materials)

### Serialized Items Manager

Complete management interface for serialized items:

#### Dashboard
- Status breakdown showing counts by:
  - Available
  - In Use
  - On Hire
  - Maintenance
  - Retired

#### Features
- **Add Serialized Item**: Register new units with serial numbers
- **Edit Item**: Update condition, status, location, service dates
- **Delete Item**: Remove individual units
- **Search**: Find units by serial number or notes
- **Batch Management**: View all units for a specific item type

#### Fields Per Unit
- Serial number (required, unique)
- Location assignment
- Condition (excellent → damaged)
- Status (available → disposed)
- Purchase information
- Warranty tracking
- Service scheduling
- Custom notes

## Use Cases

### Serialized Tracking Best For:
- Heavy equipment and machinery
- Tools and power tools
- IT equipment (laptops, tablets, etc.)
- Vehicles
- High-value assets
- Items requiring individual maintenance schedules
- Items with warranty tracking needs

### Bulk Tracking Best For:
- Consumable supplies
- Small parts and components
- Materials sold by weight or volume
- Low-value items in large quantities
- Items without individual service requirements

## Business Rules

1. **Serial numbers must be unique** across all serialized items
2. **Cannot change tracking method** once transactions exist for an item
3. **Serialized items default to "available" status** when first added
4. **Quantity calculations**:
   - Serialized: Automatic count from `stock_serialized_items`
   - Bulk: Manual updates to `stock_quantities`
5. **RLS policies** ensure authenticated users can only access their organization's data

## Workflow Examples

### Adding a Serialized Item

1. Create master item in Stock Items Manager
2. Check "Track by Serial Number"
3. Save the item
4. Click quantity link or hash icon to open Serialized Items Manager
5. Add individual units with serial numbers
6. Track condition, status, and location for each unit

### Tracking Bulk Items

1. Create item in Stock Items Manager
2. Leave "Track by Serial Number" unchecked
3. Save the item
4. Update quantities through stock transactions
5. View aggregate quantities in the list

## API Usage

### Query All Items with Quantities

```sql
SELECT * FROM stock_item_quantities;
```

Returns unified quantity data regardless of tracking method.

### Get Serialized Units for an Item

```sql
SELECT * FROM stock_serialized_items
WHERE item_id = 'item-uuid'
ORDER BY serial_number;
```

### Check Item Tracking Method

```sql
SELECT is_serialized FROM stock_items WHERE id = 'item-uuid';
```

## Migration Notes

- Existing items default to `is_serialized = false` (bulk tracking)
- Items with type "serialized" automatically set to `is_serialized = true`
- No data migration required for existing quantity records
- Serialized tracking is opt-in on a per-item basis
