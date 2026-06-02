# Brain 2.0

A polished Google Sheets-powered personal knowledge base for notes, tasks, milestones, AI enhancement, and idea linking.

## Features

- **Google Sheets sync** — read, create, edit, delete, and reorder entries using the Sheets API.
- **Dashboard** — focused stats, due/overdue work, sentiment, categories, tags, people, and milestones.
- **Multiple views** — cards, table, task board, graph, and dashboard.
- **AI tools** — rewrite, title, tag, categorize, extract actions, digest, relate entries, and export.
- **Milestones** — birthdays, anniversaries, special dates, confetti, reminders, and PWA shortcuts.
- **Graph workflow** — typed wiki-links like `[[Title|supports]]`, backlinks, related entries, and graph exploration.
- **Filtering** — search, categories, sub-categories, status, people, tags, date ranges, sort, and sentiment filters.
- **Demo mode** — explore the app without signing in.
- **PWA support** — installable app, offline shell, shortcuts for new entry, milestone, and task board.

## Local Development

```bash
npm install
echo "VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com" > .env.local
# Optional when using your own sheet:
echo "VITE_GOOGLE_SHEET_ID=your-google-sheet-id" >> .env.local
npm run dev
```

Open `http://localhost:5000`.

Useful commands:

```bash
npm run test
npm run audit
npm run check
npm run build
```

## Google Setup

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Create or choose a project.
3. Enable **Google Sheets API**.
4. Create an OAuth 2.0 Client ID for a **Web application**.
5. Add authorized JavaScript origins:
   - `http://localhost:5000`
   - `https://YOUR-USERNAME.github.io`
6. Save the Client ID as `VITE_GOOGLE_CLIENT_ID`.

## Deploy To GitHub Pages

1. Add the repo secret `VITE_GOOGLE_CLIENT_ID`.
2. Optional: add `VITE_GOOGLE_SHEET_ID` if the deployment should use a different sheet.
3. Ensure GitHub Pages is configured for GitHub Actions.
4. Push to `main`.

The workflow runs install, tests, production dependency audit, build, and Pages deployment. The production base path is `/brain2.0/`.

## Sheet Structure

The app expects these columns in order:

| Column | Field |
|---|---|
| A | Sr. No |
| B | Title |
| C | Created at |
| D | Updated at |
| E | Category |
| F | Sub Category |
| G | Original |
| H | Rewritten |
| I | Action Items |
| J | Due Date |
| K | Task Status |
| L | Links |
| M | Media URL |
| N | Tags |
| O | Message ID |
| P | People |

The app also creates a `Config` sheet for custom categories, tags, category colors, quick filters, and milestones.

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS
- Zustand
- @dnd-kit
- Google Identity Services
- Google Sheets API v4
- OpenAI / Anthropic client-side AI calls
- vite-plugin-pwa

## About Ameya Agrawal

Ameya Agrawal is an IIM Kozhikode Gold Medalist, Strategy Manager at MIT World Peace University (MIT-WPU), author of *A Leap Within*, and a founder-builder working across AI tools, education, and social impact.

[GitHub](https://github.com/ameyaagrawal99) · [LinkedIn](https://www.linkedin.com/in/ameyaagrawal/) · [X](https://x.com/ameyaAgrawal) · [blog.ameya.page](https://blog.ameya.page)
