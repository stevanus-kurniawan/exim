# Frontend Layout Redesign — Analysis & Strategy

## Step 1: Major UI/UX Layout Problems

### 1. Content area
- **Over-centered**: `MainLayout` uses `max-width: 1200px` + `margin: 0 auto`, so content sits in the middle with large empty gutters on wide screens.
- **Rigid**: Single fixed max-width; no sense of a “working” surface that uses space.

### 2. Page titles
- **Oversized / decorative**: `PageHeader` uses `font-size: 32px` (h2) and `font-family: heading` (Merriweather serif), which feels like a marketing headline, not an operations screen.
- **Hierarchy**: Subtitle and section labels use similar or large sizes; operational hierarchy is weak.

### 3. Search and action bar
- **Awkward placement**: `ActionBar` splits “left” (search + filters) and “right” (primary action) with `justify-content: space-between`. Search has a fixed `max-width: 320px`, so it doesn’t feel like a unified toolbar.
- **Mobile**: Flex wrap can leave buttons and search in odd positions; no clear “toolbar” grouping.

### 4. Action controls
- **Not cohesive**: Search input, search button, refresh, and primary CTA are separate elements; no clear visual grouping (e.g. search + actions in one strip).
- **List pages**: PO and Shipments use different patterns; controls don’t feel intentional.

### 5. Dashboard cards
- **Rigid**: Metric cards use a grid but feel like separate blocks; hover uses `translateY(-2px)`, which can feel gimmicky.
- **Disconnected**: Quick actions sit in another card; “Recent shipments” section has a large title; overall rhythm is heavy.

### 6. Empty states
- **Too large**: `EmptyState` uses large padding (40px), center-aligned text, dashed border, and big title (24px), so it dominates the page.
- **Static**: Single layout; not reusable as a compact inline state.

### 7. Sidebar
- **Blocky active state**: Active item uses full `background-color: #f4f4f4` and primary color, which feels heavy.
- **Mobile**: Becomes a horizontal strip (flex row) below header instead of a drawer; poor use of space and clarity.

### 8. Responsiveness
- **Layout**: On small viewports, sidebar doesn’t collapse to a drawer; content and toolbar can feel cramped or randomly wrapped.
- **No menu toggle**: Header has no way to open the nav on mobile.

### 9. Menu/button positioning
- **Desktop**: Sidebar is always visible (good) but active state and spacing could be refined.
- **Mobile**: Nav items wrap in a row; primary actions on list pages can wrap awkwardly.

---

## Step 2: Improved Responsive Layout Strategy

### App shell
- **Header**: Keep; add a menu toggle button visible only below a breakpoint (e.g. 1024px). Tidy spacing and alignment (tokens).
- **Sidebar**:  
  - **Desktop (≥1024px)**: Persistent left sidebar; refined active state (e.g. left border or lighter background); consistent width and spacing.  
  - **Mobile/tablet (<1024px)**: Off-canvas drawer; overlay when open; close on overlay click or navigation; menu button in header toggles open.

### Content layout
- **Page container**: Replace “centered max-width box” with a **natural page container**: full width with consistent horizontal padding (tokens), optional max-width (e.g. 1280px or 1400px) that is **left-aligned** (margin-right: auto) or full width. No center constraint so content feels like a workspace.
- **Page header**: Breadcrumb/back + title + optional subtitle; left-aligned; reduced title size (e.g. 18–20px, primary font); clear hierarchy.

### Typography
- **Titles**: Strong but operational: primary font, smaller size (e.g. fontSize.base or 18px), semibold; reserve serif for rare brand moments.
- **Hierarchy**: Section labels (small/caps or small weight), card labels (small), helper text (xs); all from tokens.

### Action toolbar (list pages)
- **Desktop**: Single horizontal bar: search field (flex-grow, sensible max-width) + search button + refresh + primary CTA; all aligned and visually grouped (e.g. shared background or border).
- **Mobile**: Stack: search full width; then one row of buttons (search, refresh, primary) so order and grouping stay clear.

### Sidebar
- **Spacing**: Use token spacing for list items and section gaps.
- **Active state**: Lighter treatment: e.g. left border (2–3px primary) + subtle background, or only border; avoid big blocks.
- **Sections**: “More modules” and similar as quieter labels (xs, steel color).

### Dashboard
- **Metric cards**: Use a **StatsCard** (or SummaryCard): compact label + number; subtle border/card; no hover lift (or very subtle); grid that reflows (1 col mobile, 2–3 tablet, 5 desktop).
- **Quick actions**: Shorter section or inline with metrics; buttons sized and spaced with tokens.
- **Recent activity**: Tighter section title; compact list rows; balanced spacing.

### Empty states
- **Compact**: Less padding; smaller title; short helper text; single clear action; optional light border (no dashed).
- **Consistent**: Reuse same component on PO, Shipments, and dashboard.

### Responsive rules
- **Breakpoints**: 768px (mobile), 1024px (tablet/desktop). Sidebar drawer below 1024px.
- **Toolbar**: At small width, stack or wrap in a defined order (search → actions).
- **Cards / grids**: Reflow (1–2–3–5 columns); spacing from tokens.
- **Touch**: Buttons and nav items have enough tap area.

---

## Step 3: Files to Update or Create

### Layout (shell)
- `frontend/components/layout/AppLayout.tsx` — Add mobile drawer state; pass to Header and Sidebar.
- `frontend/components/layout/AppLayout.module.css` — Overlay for drawer; any wrapper tweaks.
- `frontend/components/layout/Header.tsx` — Menu toggle button (mobile); accept `onMenuClick`; spacing.
- `frontend/components/layout/Header.module.css` — Toggle visibility (desktop hide); spacing.
- `frontend/components/layout/Sidebar.tsx` — Drawer on mobile; close on route change and overlay; accept `isOpen`, `onClose`.
- `frontend/components/layout/Sidebar.module.css` — Drawer positioning; refined active state; “More modules” style.
- `frontend/components/layout/MainLayout.tsx` — Optional rename to PageContainer concept; adjust max-width and alignment.
- `frontend/components/layout/MainLayout.module.css` — Natural container (padding, optional max-width, left-aligned).

### Page structure
- `frontend/components/navigation/PageHeader.tsx` — Optional: accept optional breadcrumb; keep back link.
- `frontend/components/navigation/PageHeader.module.css` — Smaller title (operational); primary font; spacing.
- `frontend/components/navigation/ActionBar.tsx` — Keep API; improve structure for toolbar grouping.
- `frontend/components/navigation/ActionBar.module.css` — Cohesive toolbar look; responsive stack; search grouping.
- `frontend/components/navigation/EmptyState.tsx` — No API change.
- `frontend/components/navigation/EmptyState.module.css` — Compact; left-aligned or modest center; no dashed border.

### Cards & dashboard
- `frontend/components/cards/Card/Card.tsx` — No change.
- `frontend/components/cards/Card/Card.module.css` — Optional: subtle tweaks.
- **New** `frontend/components/cards/StatsCard/StatsCard.tsx` — Metric card (label + value + optional link).
- **New** `frontend/components/cards/StatsCard/StatsCard.module.css` — Tokens only.
- **New** `frontend/components/cards/StatsCard/index.ts`
- `frontend/components/cards/index.ts` — Export StatsCard.
- `frontend/app/dashboard/DashboardContent.tsx` — Use StatsCard; tighten sections.
- `frontend/app/dashboard/DashboardContent.module.css` — Grid; spacing; smaller section titles.

### List pages (use updated toolbar & empty state)
- `frontend/app/dashboard/po/PoList.tsx` — Use updated PageHeader and ActionBar (no structural change).
- `frontend/app/dashboard/po/PoList.module.css` — Toolbar and layout tweaks if needed.
- `frontend/app/dashboard/shipments/ShipmentList.tsx` — Same.
- `frontend/app/dashboard/shipments/ShipmentList.module.css` — Same.

### Global
- `frontend/styles/globals.css` — Only if needed for body overflow when drawer open (optional).

No backend or product structure changes. No new design tokens; use only `frontend/design-tokens.json`.
