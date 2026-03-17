# Brain 2.0

A personal knowledge base PWA built with React 19, Vite 6, TypeScript, and Tailwind CSS. Manages tasks, milestones, wiki-links, and notes using Google Sheets as the data backend.

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite 6
- **State Management**: Zustand (`src/store/useBrainStore.ts`)
- **Data Backend**: Google Sheets API (`src/lib/sheets.ts`)
- **Auth**: Google Sign-In (GSI) via `src/hooks/useAuth.ts`
- **AI features**: OpenAI via `src/hooks/useAI.ts`
- **Drag & Drop**: @dnd-kit
- **PWA**: vite-plugin-pwa with workbox

## Design System

All design tokens are CSS custom properties on `:root` in `src/styles/globals.css`:
- **Colors**: `--color-brand` (indigo), `--color-bg` (warm paper #F8F7F4), `--color-surface`, `--color-ink`, etc.
- **Shadows**: `--shadow-xs` through `--shadow-xl`
- **Tailwind custom colors**: `brand`, `bg`, `surface`, `ink`, `ink2`, `ink3`, `ok`, `warn`, `danger`, `info`
- **Animations**: `animate-fadeIn`, `animate-slideUp`, `animate-scaleIn`, `animate-slideInLeft`, `animate-fab-in`

## Layout

```
AppShell
├── NavRail (56px fixed left, hidden on mobile)  ← src/components/layout/NavRail.tsx
├── Sidebar (fixed overlay panel, always z-40)   ← src/components/layout/Sidebar.tsx
├── Header (48px, sm:ml-14 offset)               ← src/components/layout/Header.tsx
├── FilterBar (pill-based, sm:ml-14)             ← src/components/layout/FilterBar.tsx
├── StatsBar (sm:ml-14 wrapper)                  ← src/components/layout/StatsBar.tsx
├── Main content (CardView / TableView / etc.)
└── BottomNav (mobile only, fixed bottom)        ← src/components/layout/BottomNav.tsx
```

- NavRail takes 56px (`w-14`) on desktop; all content areas use `sm:ml-14`
- Sidebar is always a `fixed` overlay (never `relative`), offset `sm:left-14` to clear NavRail
- BottomNav uses pill-style active indicator (`bg-brand/12` rounded pill behind icon)

## Key Files

```
src/
  components/
    layout/
      NavRail.tsx      - Left 56px icon rail: logo, view switcher, dashboard, AI, settings
      AppShell.tsx     - Root shell: layout composition, MilestoneBanner, keyboard shortcuts
      Header.tsx       - Slim 48px top bar: Memories dropdown, dark mode, sync, New button
      FilterBar.tsx    - Horizontal pill filter bar: search, date, categories, tags, sort
      Sidebar.tsx      - Dashboard slide-over overlay panel
      BottomNav.tsx    - Mobile bottom nav with pill active state and New menu sheet
    views/
      BrainCard.tsx    - Knowledge card: category color bar, task progress, tags, links
      CardView.tsx     - Card grid (1→2→3→4 cols responsive)
  styles/
    globals.css        - Design tokens, animations, utility classes
```

## Category Color Mapping

Lives in `src/components/views/BrainCard.tsx` (`CAT_COLORS`). Supports prefix matching. Each category gets a 3px top accent bar and a colored dot label.

## Environment Variables

- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID from Google Cloud Console
- `VITE_OPENAI_API_KEY` — OpenAI key for AI features (optional)

## Development

```bash
npm install
npm run dev    # starts on port 5000
```

## Deployment

Static site:
- Build: `npm run build`
- Output: `dist/`
