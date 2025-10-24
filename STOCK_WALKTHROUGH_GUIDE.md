# Stock Management System - Complete Walkthrough Guide

## How to Access the Stock Module

1. **Login to the application** with your credentials
2. **Click on "Stock" in the main navigation menu** (left sidebar)
3. You'll see the Stock Management dashboard with:
   - Collapsible sidebar with 7 sections
   - Statistics overview at the top
   - Main content area showing the current section

---

## 10 Key Features Walkthrough

### Feature 1: Comprehensive Stock Item Catalog with Unique Codes, Barcodes & Serial Numbers

**Where to Access:** Stock → Stock Items section

**What You'll See:**
- A list of all inventory items with their unique item codes (e.g., SAFMAS002, ZCOLAP011)
- Each item displays barcode and QR code indicators
- Filter and search capabilities

**How to Use:**

1. **View Items:**
   - Navigate to Stock → Stock Items
   - See 8 sample items loaded (including 7 regular items and 1 kit)
   - Switch between List view (table) and Grid view (cards) using the icons in the top right

2. **Search Items:**
   - Use the search box to find items by:
     - Item code (e.g., "SAFMAS002")
     - Name (e.g., "Dust Mask")
     - Description
     - Manufacturer (e.g., "Dell")
     - Model

3. **Barcode & QR Code:**
   - Each item has a unique barcode (e.g., "SAFMAS002-BC")
   - QR codes are automatically generated containing: item type, code, ID, and timestamp
   - Icons show which items have barcodes (barcode icon) and QR codes (QR icon)

4. **Sample Items to Explore:**
   - **SAFMAS002** - Consumable item (Dust Masks)
   - **ZCOLAP011** - Serialized item (Laptop - requires individual tracking)
   - **SAFCAP013** - Non-serialized equipment (Hard Hats)
   - **KIT-SAFETY-01** - Virtual kit containing multiple items

---

### Feature 2: Multi-Level Categorization (Stores → Bins → Categories)

**Where to Access:** Stock → Stock Items section (use the filter dropdowns)

**What You'll See:**
- **5 Stores** created from your inventory:
  - STORE-1: Clothes (Safety clothing & PPE)
  - STORE-10: Material (General materials)
  - STORE-85: Furniture and Office Equipment
  - STORE-91: Scaffold and Formwork
  - STORE-98: Tools and Equipment

- **14 Bins** organized within stores:
  - Store 1 bins: boot, earplug, gloves, headgear, jacket, overhauls, pants, shoes, vests
  - Store 85 bins: cabinet, chair, desk, laptop, screen

- **4 Categories** for classification:
  - Safety Equipment
  - Furniture & Office
  - Tools & Equipment
  - Scaffolding & Formwork

**How to Use:**

1. **Filter by Store:**
   - Click the "All Stores" dropdown
   - Select a store (e.g., "STORE-1 - Clothes")
   - Items list updates to show only items in that store

2. **Filter by Bin:**
   - First select a store
   - Then use the "All Bins" dropdown
   - Select a bin (e.g., "boot - Boots")
   - See items in that specific bin location

3. **View Item Location:**
   - In the list view, the "Location" column shows:
     - Store name (e.g., "Clothes")
     - Bin name below it (e.g., "Boots")
   - In grid view, location shows with a map pin icon

4. **Example Navigation:**
   - Filter: STORE-85 → laptop bin
   - Result: Shows "Laptop - Dell Inspiron 15 3511"

---

### Feature 3: Dual Inventory Tracking (Serialized vs Bulk/Non-Serialized)

**Where to Access:** Stock → Stock Items section

**What You'll See:**
- Items marked as different types in the database
- Serialized items require individual unit tracking
- Non-serialized items track by quantity

**How to Use:**

1. **Serialized Items** (item_type = 'serialized'):
   - Example: **ZCOLAP011** (Dell Laptop)
   - Example: **ZCOSCR006** (Dell Monitor)
   - These items need individual serial numbers for each unit
   - Perfect for: Electronics, vehicles, expensive equipment
   - Each unit can be tracked separately with its own:
     - Serial number
     - Purchase date
     - Condition
     - Location
     - Service history

2. **Non-Serialized Items** (item_type = 'non_serialized'):
   - Example: **SAFCAP013** (Hard Hats)
   - Example: **SAFBOO026** (Safety Boots)
   - Track total quantity only
   - Perfect for: Standard equipment, tools, furniture

3. **Consumable Items** (item_type = 'consumable'):
   - Example: **SAFMAS002** (Dust Masks)
   - Items that are used up and need regular replenishment
   - Track quantity and reorder levels

4. **Kit Items** (item_type = 'kit'):
   - Example: **KIT-SAFETY-01** (Safety Starter Kit)
   - Virtual grouping of multiple items
   - See Feature 9 for more details

---

### Feature 4: Detailed Specifications (Make, Model, Year, Dimensions, Weight, Color, Capacity)

**Where to Access:** Stock → Stock Items section (view item details)

**What You'll See:**
- Manufacturer/Make information
- Model details
- Physical specifications

**How to Use:**

1. **View Specifications in List:**
   - "Make/Model" column shows:
     - Manufacturer (e.g., "Dell")
     - Model below it (e.g., "Inspiron 15 3511")

2. **Sample Items with Full Specs:**
   - **ZCOLAP011 (Laptop)**:
     - Manufacturer: Dell
     - Model: Inspiron 15 3511
     - Dimensions: 358x235x18mm
     - Weight: 1.8 kg
     - Full description with processor, RAM, storage

   - **ZCOSCR006 (Monitor)**:
     - Manufacturer: Dell
     - Model: 22" LED Monitor
     - Dimensions: 490x370x175mm
     - Weight: 3.2 kg

   - **ZFUCHA004 (Chair)**:
     - Manufacturer: Indy Office
     - Model: Visitor Bonded
     - Dimensions: 600x600x900mm
     - Weight: 12.5 kg

3. **How Specifications Help:**
   - Quick identification of equipment
   - Planning space requirements (dimensions)
   - Transportation planning (weight)
   - Equipment comparison
   - Replacement purchasing

---

### Feature 5: Multiple Image Management (Photo Gallery per Item)

**Where to Access:** Stock → Stock Items section

**Database Table:** `stock_item_images`

**What's Available:**
- Upload multiple images per stock item
- Set one image as primary
- Add captions to images
- Sort order control
- Images stored in Supabase storage bucket 'stock-images'

**How to Use:**

1. **Upload Images:**
   - Click the image icon or camera button on an item
   - Select multiple images from your device
   - Set one as the primary image (shows first)

2. **View Gallery:**
   - Click on an item's image thumbnail
   - Navigate through multiple photos
   - See captions and details

3. **Storage Details:**
   - Images are stored securely in Supabase
   - Public access for viewing
   - Only authorized users can upload/delete
   - Automatic metadata tracking (file size, type, upload date)

---

### Feature 6: Custom Fields System for Industry-Specific Attributes

**Where to Access:** Stock → Stock Items section (custom fields in item details)

**Database Tables:** `stock_custom_fields`, `stock_items.custom_fields` (JSONB column)

**What's Available:**
- Define custom fields per category
- Field types: text, number, date, boolean, select, multiselect
- Apply fields to specific categories
- Required/optional control

**How to Use:**

1. **Define Custom Fields:**
   - Go to Stock → Settings (when implemented)
   - Create custom field definitions
   - Example fields for construction equipment:
     - "Service Interval (hours)"
     - "Certificate Expiry Date"
     - "Lifting Capacity"
     - "Fuel Type"
     - "Engine Hours"

2. **Assign to Categories:**
   - Set which categories each field applies to
   - Example: "Engine Hours" applies to "Tools & Equipment" only

3. **Use Custom Fields:**
   - When editing an item, custom fields appear based on its category
   - Data stored in flexible JSONB format
   - Search and filter by custom fields

4. **Example Use Cases:**
   - **Scaffolding**: Height, Load Capacity, Inspection Date
   - **Laptops**: Processor, RAM, Storage, OS License
   - **Safety Equipment**: Certification Level, Expiry Date, Size
   - **Vehicles**: License Plate, VIN, Next Service Due

---

### Feature 7: Automatic Barcode & QR Code Generation with Printable Labels

**Where to Access:** Stock → Stock Items section (print icon per item)

**Helper Functions:** `/src/lib/barcodeHelpers.ts`

**What's Available:**
- Automatic barcode generation
- QR code with JSON metadata
- Asset code generation per store/category
- Printable label formatting
- Barcode validation

**How to Use:**

1. **View Barcodes:**
   - All items automatically get barcodes when created
   - Format: `ITEMCODE-BC` (e.g., "SAFMAS002-BC")
   - Barcode icon shows items with barcodes

2. **View QR Codes:**
   - QR codes contain structured JSON data:
     ```json
     {
       "type": "stock_item",
       "code": "SAFMAS002",
       "id": "uuid-here",
       "timestamp": "2025-10-22T07:00:00Z"
     }
     ```
   - QR icon shows items with QR codes
   - Scan with any QR reader to get item details

3. **Generate Asset Codes:**
   - Function: `generateAssetCode(storeCode, categoryPrefix)`
   - Creates unique codes like: "STORE1-AS25-0001"
   - Useful for serialized equipment

4. **Print Labels:**
   - Click the printer icon next to an item
   - Generates printable label with:
     - Item code
     - Item name
     - Barcode (formatted for readability)
     - QR code preview
   - Standard 4" x 2" label format
   - Ready for label printers

5. **Barcode Functions Available:**
   - `generateBarcode()` - Creates unique barcode
   - `formatBarcodeForDisplay()` - Formats with hyphens for reading
   - `validateBarcode()` - Checks format validity
   - `parseQRCode()` - Extracts data from QR code

---

### Feature 8: Replacement Cost Tracking with Purchase Price History

**Where to Access:** Stock → Stock Items section (purchase history per item)

**Database Table:** `stock_purchase_history`

**What You'll See:**
- Complete purchase history for each item
- Cost tracking over time
- Supplier information
- Invoice references

**Sample Data Loaded:**
- **SAFMAS002 (Dust Masks)**: 2 purchases
  - Aug 2025: 50 units @ $3.45 = $172.50
  - Sep 2025: 100 units @ $3.59 = $359.00

- **ZCOLAP011 (Laptop)**: 1 purchase
  - Jul 2025: 2 units @ $10,868.70 = $21,737.40

- **SAFBOO026 (Safety Boots)**: 1 purchase
  - Jun 2025: 5 units @ $1,110.00 = $5,550.00

**How to Use:**

1. **View Purchase History:**
   - Click on an item to see details
   - Navigate to "Purchase History" tab
   - See all historical purchases

2. **Track Cost Changes:**
   - Compare unit costs over time
   - Identify price trends
   - Example: Dust mask increased from $3.45 to $3.59 (4% increase)

3. **Information Per Purchase:**
   - Purchase date
   - Supplier name
   - Quantity purchased
   - Unit cost
   - Total cost
   - Invoice number
   - Notes

4. **Use Cases:**
   - Budget planning
   - Supplier price comparison
   - Cost trend analysis
   - Audit trails
   - Warranty period calculation
   - Reorder decision making

---

### Feature 9: Virtual Kit Functionality (Group Multiple Items as Hireable Packages)

**Where to Access:** Stock → Stock Items section (look for kit icon)

**Database Tables:** `stock_items` (is_kit = true), `stock_kit_components`

**Sample Kit Created:**
**KIT-SAFETY-01: Safety Starter Kit**
- Description: "Complete safety equipment starter kit for new employees"
- Total Value: $1,200.00
- Contains 3 components:
  1. **SAFCAP013** (Hard Hat White) - Qty: 1
  2. **SAFBOO026** (Safety Boots) - Qty: 1
  3. **SAFMAS002** (Dust Masks) - Qty: 5

**How to Use:**

1. **Identify Kits:**
   - Look for the box icon next to item codes
   - Filter by item type = 'kit'
   - Example: **KIT-SAFETY-01**

2. **View Kit Components:**
   - Click on a kit item
   - See "Components" tab
   - Lists all items included with quantities

3. **Kit Component Properties:**
   - Quantity (how many of each item)
   - Optional flag (required vs optional components)
   - Sort order (display sequence)

4. **Create Your Own Kits:**
   - Navigate to Add Item
   - Check "This is a kit" option
   - Add component items with quantities
   - Set pricing for the complete kit

5. **Use Cases:**
   - **New Employee Onboarding**: Safety starter kits
   - **Project Packages**: Complete tool sets for specific tasks
   - **Rental Packages**: Equipment bundles for customers
   - **Training Kits**: Required materials for courses
   - **Emergency Kits**: Pre-packed safety equipment

6. **Benefits:**
   - Faster checkout process
   - Consistent equipment allocation
   - Simplified pricing
   - Better inventory planning
   - Reduced errors in equipment issuing

---

### Feature 10: Equipment Substitution Mapping for Alternative Recommendations

**Where to Access:** Stock → Stock Items section (item details → alternatives tab)

**Database Table:** `stock_substitutions`

**Sample Substitution Created:**
- **Primary Item:** SAFCAP010 (Hard Hats - RED)
- **Substitute:** SAFCAP013 (Hard Hats White - Employees)
- **Preference Order:** 1 (first choice alternative)
- **Notes:** "White employee hats can substitute red hats when red is out of stock"

**How to Use:**

1. **View Substitutes:**
   - Open any item details
   - Navigate to "Alternatives" or "Substitutes" tab
   - See list of acceptable substitutes

2. **Substitution Information:**
   - Substitute item details
   - Preference order (1st, 2nd, 3rd choice)
   - Notes explaining when/why to substitute
   - Price comparison

3. **Create Substitution Mappings:**
   - Select primary item
   - Add substitute items
   - Set preference order
   - Add usage notes

4. **Use Cases:**
   - **Out of Stock Scenarios**: Recommend alternatives
   - **Equipment Upgrades**: Suggest better options
   - **Cost Optimization**: Offer cheaper equivalents
   - **Size Variations**: Map between sizes
   - **Brand Alternatives**: Different manufacturers, same function

5. **Example Scenarios:**

   **Scenario 1: Color Variations**
   - Primary: Red Hard Hat
   - Substitute: White Hard Hat
   - Use when: Red is out of stock, white serves same purpose

   **Scenario 2: Equipment Generations**
   - Primary: Dell Monitor 22"
   - Substitute: Dell Monitor 24" (newer model)
   - Use when: 22" discontinued, 24" is current model

   **Scenario 3: Tool Sizes**
   - Primary: Wrench 15mm
   - Substitutes: Adjustable wrench (1st), 14mm wrench (2nd)
   - Use when: Exact size unavailable

6. **Benefits:**
   - Reduce stockouts impact
   - Improve customer service
   - Optimize inventory levels
   - Facilitate equipment planning
   - Standardize substitute decisions

---

## Quick Start Summary

### To See Your Stock Data Right Now:

1. **Login to the application**
2. **Click "Stock" in the left navigation**
3. **Click "Stock Items" in the Stock sidebar**
4. **You should now see:**
   - 5 stores in the filter dropdown
   - 8 items in the list (7 regular + 1 kit)
   - Statistics showing: 8 total items, 8 active, 1 kit, ~$18k total value

### Sample Data Overview:
- ✅ 5 Stores (matching your PDF structure)
- ✅ 14 Bins (organized storage locations)
- ✅ 4 Categories (for classification)
- ✅ 8 Stock Items (mixture of types)
- ✅ 1 Virtual Kit (with 3 components)
- ✅ 4 Purchase History Records (cost tracking)
- ✅ 1 Substitution Mapping (alternatives)
- ✅ Barcodes on all items
- ✅ QR codes on all items

### Next Steps to Populate Your Full Inventory:

1. Use the existing structure as a template
2. Import your 4,482 items from the PDF
3. Can be done via:
   - CSV import (can be built)
   - Bulk SQL insert
   - Excel import tool
   - Manual entry for high-value items

---

## Navigation Tips

### Stock Module Sections:
1. **Stock Items** ✅ (Active - shows all features above)
2. **Hires & Bookings** (Coming in Part 2)
3. **Transfers** (Coming in Part 3)
4. **Maintenance** (Coming in Part 4)
5. **Invoicing** (Coming in Part 5)
6. **Customers** (Coming in Part 6)
7. **Reports** (Coming in Part 7)

### Collapsible Sidebar:
- Hover over sidebar to expand (shows full names)
- Move mouse away to collapse (shows icons only)
- Blue highlight shows active section
- Count badges show totals (e.g., "8" items)

---

## Need Help?

If you can't see the items:
1. Make sure you're logged in
2. Navigate to Stock → Stock Items
3. Try clearing any filters (set both dropdowns to "All")
4. Refresh the page

The sample data is ready and waiting for you to explore all 10 key features!
