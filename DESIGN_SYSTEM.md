# Design System & UI Standards

This document defines the consistent design patterns, components, and styling to be used throughout the application.

## Core Principles

1. **Minimalist**: Clean, uncluttered interfaces with ample whitespace
2. **Compact**: Efficient use of space without feeling cramped
3. **Consistent**: Same patterns across all modules
4. **Responsive**: Mobile-first approach with thoughtful breakpoints
5. **Professional**: Business-appropriate color palette and typography

## Color Palette

### Primary Colors
- **Blue**: `bg-blue-600` / `text-blue-600` - Primary actions, active states
- **Slate/Gray**: `bg-slate-800` / `text-gray-600` - Sidebars, secondary text
- **White**: `bg-white` - Cards, panels, content areas

### Status Colors
- **Success/Good**: `bg-green-600` / `text-green-600`
- **Warning/At Risk**: `bg-yellow-600` / `text-yellow-600` / `bg-orange-600`
- **Error/Poor**: `bg-red-600` / `text-red-600`
- **Info**: `bg-blue-600` / `text-blue-600`
- **Neutral**: `bg-gray-600` / `text-gray-600`
- **Purple**: `bg-purple-600` - For serialized/special items

### Background Colors
- **Page Background**: `bg-gray-50`
- **Card Background**: `bg-white`
- **Sidebar Background**: `bg-slate-800`
- **Hover States**: `hover:bg-gray-50` / `hover:bg-slate-700`

## Typography

### Font Sizes
- **Page Title**: `text-xl lg:text-2xl` (20px → 24px)
- **Section Heading**: `text-lg lg:text-xl` (18px → 20px)
- **Subsection**: `text-base lg:text-lg` (16px → 18px)
- **Body Text**: `text-sm lg:text-base` (14px → 16px)
- **Small Text**: `text-xs lg:text-sm` (12px → 14px)
- **Tiny Text**: `text-[10px] lg:text-xs` (10px → 12px)

### Font Weights
- **Bold**: `font-bold` - Titles, important metrics
- **Semibold**: `font-semibold` - Section headers
- **Medium**: `font-medium` - Button text, navigation items
- **Normal**: `font-normal` - Body text

### Text Colors
- **Primary**: `text-gray-900` - Main headings
- **Secondary**: `text-gray-600` - Descriptions, labels
- **Tertiary**: `text-gray-500` - Meta info, timestamps
- **Muted**: `text-gray-400` - Placeholders

## Spacing

### Standard Spacing Scale (Tailwind)
- **Compact**: `p-2` / `m-2` / `gap-2` (8px)
- **Normal**: `p-3 lg:p-4` / `gap-3 lg:gap-4` (12px → 16px)
- **Comfortable**: `p-4 lg:p-6` / `gap-4 lg:gap-6` (16px → 24px)

### Component Spacing
- **Card Padding**: `p-3 lg:p-4`
- **Modal Padding**: `p-4 lg:p-6`
- **Section Spacing**: `space-y-3 lg:space-y-4` or `space-y-4 lg:space-y-6`

## Layout Structure

### Module Layout Pattern

All standalone modules (Stock, Plant, Settings, Employees) should follow this structure:

```
<div className="flex h-full">
  {/* Collapsible Sidebar */}
  <aside className="bg-slate-800 w-20 hover:w-64">
    {/* Navigation items */}
  </aside>

  {/* Main Content */}
  <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
    {/* Mobile Header (lg:hidden) */}
    <div className="lg:hidden bg-white border-b px-4 py-3">
      {/* Module name and menu button */}
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      {/* Module content */}
    </div>
  </div>
</div>
```

### Projects Module Pattern

Projects module uses the main app sidebar:

```
<div className="space-y-4 lg:space-y-6">
  {/* Header with action */}
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-xl lg:text-2xl font-bold">Title</h2>
      <p className="text-sm lg:text-base text-gray-600">Description</p>
    </div>
    <button className="primary-button">Action</button>
  </div>

  {/* Stats/Content */}
</div>
```

## Components

### 1. Sidebars

#### Standalone Module Sidebar
```html
<aside
  onMouseEnter={() => setExpanded(true)}
  onMouseLeave={() => setExpanded(false)}
  className="bg-slate-800 text-white w-20 hover:w-64 transition-all duration-300"
>
  <nav className="py-4 space-y-1">
    <button className="w-full flex items-center px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
      <Icon size={20} className="flex-shrink-0" />
      {expanded && <span className="ml-3 font-medium">{name}</span>}
    </button>
  </nav>
</aside>
```

**Key Standards**:
- Background: `bg-slate-800`
- Width: `w-20` collapsed, `w-64` expanded
- Icons: `size={20}`
- Active state: `bg-slate-700 border-l-4 border-blue-500`
- Hover: `hover:bg-slate-700 hover:text-white`
- Text: `text-slate-300` default, `text-white` active/hover

### 2. Headers

#### Page Header (with action button)
```html
<div className="flex items-center justify-between mb-4 lg:mb-6">
  <div>
    <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Page Title</h2>
    <p className="text-sm lg:text-base text-gray-600 mt-1">Description</p>
  </div>
  <button className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base">
    <Plus size={18} />
    <span className="hidden sm:inline">Add Item</span>
    <span className="sm:hidden">Add</span>
  </button>
</div>
```

#### Mobile Header (inside standalone modules)
```html
<div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
  <button className="p-2 rounded-lg hover:bg-gray-100">
    <Menu size={20} />
  </button>
  <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
  <div className="w-10"></div>
</div>
```

### 3. Stat Cards

```html
<div className="bg-white rounded-lg border border-gray-200 p-3 lg:p-4">
  <div className="flex items-center justify-between">
    <div className="flex-1 min-w-0">
      <p className="text-xs lg:text-sm text-gray-600 truncate">Label</p>
      <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && (
        <p className="text-[10px] lg:text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
      )}
    </div>
    <Icon className="text-gray-400 flex-shrink-0" size={20} />
  </div>
</div>
```

**Key Standards**:
- Background: `bg-white`
- Border: `border border-gray-200`
- Rounded: `rounded-lg`
- Padding: `p-3 lg:p-4`
- Label: `text-xs lg:text-sm text-gray-600`
- Value: `text-xl lg:text-2xl font-bold` with semantic color
- Icon: `size={20}` with appropriate color
- Use `flex-shrink-0` on icons
- Use `truncate` on text that might overflow

### 4. Buttons

#### Primary Button
```html
<button className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base">
  <Icon size={18} />
  <span>Button Text</span>
</button>
```

#### Secondary Button
```html
<button className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm lg:text-base">
  <Icon size={18} />
  <span>Button Text</span>
</button>
```

#### Danger Button
```html
<button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
  <Icon size={18} />
  <span>Delete</span>
</button>
```

**Key Standards**:
- Icon size: `size={18}` (consistent across all buttons)
- Padding: `px-3 lg:px-4 py-2`
- Gap: `gap-1 lg:gap-2`
- Border radius: `rounded-lg`
- Text size: `text-sm lg:text-base`
- Always include `transition-colors`
- Mobile: Consider hiding text with `hidden sm:inline`

### 5. Form Inputs

#### Text Input
```html
<input
  type="text"
  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  placeholder="Placeholder"
/>
```

#### Select Dropdown
```html
<select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
  <option value="">Select...</option>
</select>
```

#### Hierarchical Dropdown (Multi-Select with Checkboxes)

For parent-child relationships like categories, use a hierarchical display with indentation:

```html
<div className="bg-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto space-y-1">
  {hierarchicalCategories.map((category) => (
    <label
      key={category.id}
      className="flex items-center gap-2 cursor-pointer hover:bg-gray-600 p-2 rounded transition-colors"
      style={{ paddingLeft: `${(category.level || 0) * 20 + 8}px` }}
    >
      <input
        type="checkbox"
        checked={selectedCategories.includes(category.id)}
        onChange={() => handleToggleCategory(category.id)}
        className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-white text-sm">
        {(category.level || 0) > 0 && (
          <span className="text-gray-500 mr-1">└</span>
        )}
        {category.name}
      </span>
    </label>
  ))}
</div>
```

**Helper function to build hierarchy:**
```typescript
const buildCategoryHierarchy = (categories: Category[]): Category[] => {
  const categoryMap = new Map<string, Category>();
  const rootCategories: Category[] = [];

  // Create map of all categories
  categories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [], level: 0 });
  });

  // Build hierarchy
  categories.forEach(cat => {
    const category = categoryMap.get(cat.id)!;
    if (cat.parent_id) {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        category.level = (parent.level || 0) + 1;
        parent.children!.push(category);
      } else {
        rootCategories.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  });

  // Flatten hierarchy for display
  const flatList: Category[] = [];
  const traverse = (nodes: Category[]) => {
    nodes.forEach(node => {
      flatList.push(node);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  };
  traverse(rootCategories);

  return flatList;
};
```

**Key Standards:**
- Indentation: `20px per level` using inline style
- Visual indicator: `└` character for child items
- Spacing: `space-y-1` between items
- Base padding: `8px` (so level 0 = 8px, level 1 = 28px, level 2 = 48px)
- Hover state: `hover:bg-gray-600` with `transition-colors`

#### Search Input
```html
<div className="relative">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
  <input
    type="text"
    placeholder="Search..."
    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  />
</div>
```

**Key Standards**:
- Padding: `px-3 py-2`
- Text size: `text-sm`
- Border: `border border-gray-300`
- Rounded: `rounded-lg`
- Focus: `focus:ring-2 focus:ring-blue-500 focus:border-transparent`
- Icon size in inputs: `size={18}`

### 6. Badges & Status Indicators

```html
<!-- Status Badge -->
<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
  <Icon size={12} className="mr-1" />
  Active
</span>

<!-- Count Badge -->
<span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
  3
</span>
```

### 7. Tables

```html
<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
  <table className="w-full">
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Header
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200">
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm text-gray-900">
          Cell content
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### 8. Modals

```html
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
    <div className="sticky top-0 bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between">
      <h3 className="text-lg lg:text-xl font-semibold text-gray-900">Modal Title</h3>
      <button className="p-1 hover:bg-gray-100 rounded transition-colors">
        <X size={20} />
      </button>
    </div>
    <div className="p-4 lg:p-6">
      <!-- Modal content -->
    </div>
  </div>
</div>
```

## Mobile Responsiveness

### Breakpoints
- **Mobile**: `< 640px` (sm)
- **Tablet**: `640px - 1024px` (sm to lg)
- **Desktop**: `≥ 1024px` (lg)

### Mobile Patterns

#### Collapsible Filters
```html
<!-- Mobile: Toggle button -->
<button className="lg:hidden">
  <Filter size={18} />
</button>

<!-- Mobile: Collapsible section -->
<div className="lg:hidden space-y-3">
  {/* Filters */}
</div>

<!-- Desktop: Always visible -->
<div className="hidden lg:grid grid-cols-3 gap-4">
  {/* Filters */}
</div>
```

#### Responsive Text
- Show abbreviated text on mobile: `<span className="sm:hidden">Add</span>`
- Show full text on larger screens: `<span className="hidden sm:inline">Add Item</span>`

#### Responsive Sidebar
```html
<!-- Mobile: Overlay sidebar -->
{mobileSidebarOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" />
)}

<!-- Sidebar -->
<aside className={`${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
```

## Icon Standards

### Icon Sizes
- **Sidebar icons**: `size={20}`
- **Button icons**: `size={18}`
- **Input icons**: `size={18}`
- **Stat card icons**: `size={20}`
- **Small badges**: `size={12}`
- **Large feature icons**: `size={64}`

### Icon Usage
- Always use `flex-shrink-0` on icons in flex containers
- Use semantic colors: `text-gray-400`, `text-blue-600`, etc.
- Icons should be from `lucide-react` library

## Grid Layouts

### Stat Cards Grid
```html
<!-- Mobile: 2 columns, Desktop: 4-7 columns -->
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 lg:gap-4">
```

### Form Grid
```html
<!-- Responsive column layout -->
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

## Loading States

```html
<div className="flex items-center justify-center h-96">
  <div className="text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
    <p className="mt-4 text-gray-600">Loading...</p>
  </div>
</div>
```

## Empty States

```html
<div className="text-center py-12">
  <Icon className="mx-auto text-gray-400 mb-4" size={64} />
  <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
  <p className="text-gray-600 mb-6">Get started by adding your first item.</p>
  <button className="primary-button">Add Item</button>
</div>
```

## Module-Specific Standards

### Dashboard/Landing Pages

Every major module should have a dashboard view showing:
1. **Module header** (hidden on mobile, shown on desktop)
2. **Stat cards** in responsive grid
3. **Optional**: Quick actions or recent items

### Settings Pattern

Settings uses a gray sidebar (`bg-gray-800`) with:
- Icon + title when expanded
- Sub-navigation items
- Active state indication

### Module Consistency Checklist

- [ ] Uses standardized sidebar width (20 → 64)
- [ ] Consistent icon sizes (20 in sidebar, 18 in buttons)
- [ ] Proper responsive breakpoints (lg:)
- [ ] Standard button styling (primary, secondary, danger)
- [ ] Consistent spacing (p-3 lg:p-4 for cards)
- [ ] Mobile header for standalone modules
- [ ] Standardized stat cards
- [ ] Consistent form inputs
- [ ] Same color palette
- [ ] Loading/empty states included

## Implementation Priority

1. **High Priority** (Core UX)
   - Sidebar consistency
   - Button standardization
   - Mobile responsiveness
   - Stat card uniformity

2. **Medium Priority** (Polish)
   - Form input consistency
   - Modal styling
   - Table formatting

3. **Low Priority** (Nice to have)
   - Advanced animations
   - Custom tooltips
   - Enhanced transitions

## Notes

- Always test on mobile, tablet, and desktop viewports
- Use semantic HTML elements
- Maintain accessibility (aria labels, keyboard navigation)
- Keep z-index values consistent (sidebar: 50, modal: 50-60, dropdowns: 60)
- Always use `transition-colors` or `transition-all` for smooth interactions
