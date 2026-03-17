# Brain 2.0

A personal knowledge base PWA built with React + Vite + TypeScript. Manage tasks, milestones, and notes with Google Sheets as the data backend.

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite 6
- **State Management**: Zustand
- **Data Backend**: Google Sheets API (via `src/lib/sheets.ts`)
- **Auth**: Google Sign-In (GSI) via `src/hooks/useAuth.ts`
- **AI features**: OpenAI via `src/hooks/useAI.ts`
- **Drag & Drop**: @dnd-kit
- **PWA**: vite-plugin-pwa with workbox

## Project Layout

```
src/
  App.tsx            - Root component & routing
  main.tsx           - Entry point
  hooks/             - React hooks (auth, AI, filters, theme, etc.)
  lib/               - Utility libraries (sheets API, contacts, markdown, etc.)
  store/             - Zustand stores
  types/             - TypeScript types
  constants/         - Shared constants
  styles/            - Global CSS
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID from Google Cloud Console

## Development

```bash
npm install
npm run dev    # starts on port 5000
```

## Deployment

Configured as a static site:
- Build: `npm run build`
- Output: `dist/`
