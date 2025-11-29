# Design Guidelines: Web-to-EPUB Converter

## Design Approach

**System Selection**: Material Design-inspired utility interface
- **Rationale**: This is a technical tool where clarity, efficiency, and functional hierarchy are paramount. Users need to quickly input URLs, review chapter lists, configure settings, and monitor downloads.
- **Key Principles**: Information density, clear status indicators, scannable layouts, task-focused interactions

## Layout System

**Container Strategy**:
- Max-width: `max-w-6xl` for main content area, centered with `mx-auto`
- Sidebar/panel width: `w-80` (320px) for settings and metadata panels
- Full-width elements: Download progress bars and queue displays use full container width

**Spacing Primitives**: 
Use Tailwind units of **2, 4, 8, 12** for consistency
- Component padding: `p-4` or `p-6`
- Section spacing: `space-y-8` or `space-y-12`
- Card gaps: `gap-4`
- Input groups: `space-y-2` for tight associations

**Grid Layouts**:
- Chapter list: Single column with clear row separations
- Settings panel: 2-column grid for label/control pairs (`grid-cols-2 gap-4`)
- Download queue: Stacked cards with full-width progress indicators

## Typography

**Font Selection**: 
- Primary: Inter or System UI stack via Google Fonts
- Monospace: 'Courier New' or monospace for URLs, file paths, and technical details

**Type Scale**:
- Page title: `text-3xl font-bold` 
- Section headers: `text-xl font-semibold`
- Card titles/labels: `text-base font-medium`
- Body text: `text-sm`
- Technical info (URLs, file sizes): `text-xs font-mono`
- Helper text: `text-xs opacity-70`

## Component Library

### Primary Interface Components

**URL Input Section**:
- Large, prominent text input: `w-full py-3 px-4 text-base`
- Accompanying "Analyze" or "Fetch Chapters" button positioned to the right or below
- Optional format selector (EPUB/PDF) as radio buttons or segmented control below input
- Validation messages appear directly below input field

**Chapter List Display**:
- Scrollable container with fixed height: `max-h-96 overflow-y-auto`
- Each chapter: Checkbox + chapter number/title + word count/page indicator
- Select all/none controls at top of list
- Compact rows with `py-2` spacing, hover states for interactivity
- Chapter count summary: "24 of 156 chapters selected"

**Download Progress Section**:
- Individual progress cards for active downloads
- Each card contains: Book title, current chapter (e.g., "Chapter 12/45"), progress bar, speed indicator, ETA
- Progress bar: Full-width with height `h-2`, rounded corners
- Status badges for states: "Downloading", "Complete", "Error", "Queued"

**Settings Panel**:
- Collapsible accordion or dedicated tab
- Form controls: Toggle switches for boolean options, number inputs for concurrent downloads, dropdowns for format preferences
- Settings organized in logical groups with subtle divider lines

**Queue Management**:
- List view of queued conversions with drag handles for reordering
- Action buttons: Pause, Resume, Cancel, Remove
- Batch actions available when multiple items selected

### Supporting Components

**Status Indicators**:
- Icon + text combinations for clear status communication
- Loading spinners for active processes
- Success checkmarks, warning triangles, error X icons
- File size and chapter count badges as small pills with `px-2 py-1 rounded-full text-xs`

**Metadata Display**:
- Book cover preview (if detected): `w-32` thumbnail
- Title, author, description in structured layout
- Edit capability for metadata fields before download

**Action Buttons**:
- Primary action (Download): Prominent size `px-6 py-3 text-base font-semibold rounded-lg`
- Secondary actions: `px-4 py-2 text-sm rounded-md`
- Icon buttons for utility actions: `p-2 rounded-md` with icon only
- Disabled states with reduced opacity and cursor-not-allowed

**Error States**:
- Alert boxes with icon, message, and optional retry action
- Inline validation errors beneath form fields
- Missing chapter indicators in chapter list with distinctive styling

**Empty States**:
- Centered message when no URL entered: "Enter a URL above to get started"
- Empty queue state: Illustrative icon + message + suggestion

## Page Layout Structure

**Single-Page Application Layout**:
```
┌─────────────────────────────────────────────┐
│ Header: App Title + Settings Icon          │
├─────────────────────────────────────────────┤
│                                             │
│  URL Input + Format Selection               │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Chapter List (when available)              │
│  [Scrollable container]                     │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Active Downloads Section                   │
│  [Progress cards stacked]                   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Download Queue                             │
│                                             │
└─────────────────────────────────────────────┘
```

**Responsive Behavior**:
- Desktop (lg:): Side-by-side panels for settings and main content where appropriate
- Mobile: Stacked single-column layout, collapsible sections

## Specialized Features

**Visual Feedback**:
- Subtle pulse animation on active download progress bars (minimal, non-distracting)
- Smooth height transitions when expanding/collapsing chapter lists or settings
- Toast notifications for completion/errors positioned top-right

**Content Density**:
- Compact mode toggle for power users to see more chapters/downloads at once
- Comfortable default spacing for accessibility
- List virtualization for very long chapter lists (100+ chapters)

**Keyboard Navigation**:
- Tab order follows logical flow: URL input → Format selection → Analyze button → Chapter checkboxes → Download button
- Keyboard shortcuts displayed in settings: Ctrl+Enter to start download, Space to toggle checkboxes

## Images

No hero images for this application. This is a utility tool focused on function over visual appeal. All visual elements serve functional purposes:
- Optional: Small app logo/icon in header (32x32px)
- Book cover thumbnails when detected from source (aspect ratio preserved, max 128px width)
- Icon library: Use Heroicons for all UI icons (download, checkmark, error, settings, etc.)