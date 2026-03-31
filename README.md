# 🧠 Brain 2.0

A beautiful, modern frontend for your Google Sheets knowledge base. Two-way sync, drag & drop, search, filter, and mobile-ready.

## Features

- 🔄 **Two-way Google Sheets sync** — read and write back via Sheets API v4
- ✏️ **Inline editing** — edit any field directly in the modal, saves to Sheet
- ➕ **Add new entries** — create rows from the UI
- 🃏 **Card & Table views** — toggle between card grid and data table
- 🖱️ **Drag & drop** — reorder cards by dragging
- 🔍 **Search** — full-text search across all fields
- 🏷️ **Tag cloud** — click tags to filter
- 📱 **Mobile responsive** — works great on phone and desktop
- ⚡ **Fast** — Vite + React + Zustand, no heavy dependencies

## Setup

### 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Sheets API**: APIs & Services → Library → search "Sheets API" → Enable
4. Create credentials: APIs & Services → Credentials → **Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: Brain 2.0
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for local dev)
     - `https://YOUR-USERNAME.github.io` (for production)
5. Copy the **Client ID**

### 2. Local Development

```bash
cd brain2.0
npm install

# Create .env.local
echo "VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com" > .env.local

npm run dev
# Open http://localhost:5173
```

### 3. Deploy to GitHub Pages

1. Push this folder to a GitHub repository (e.g., `brain2.0`)
2. Go to repo **Settings → Secrets and variables → Actions**
3. Add secret: `VITE_GOOGLE_CLIENT_ID` = your Client ID
4. Go to **Settings → Pages** → Source: **GitHub Actions**
5. Push to `main` — the workflow auto-deploys to `https://username.github.io/brain2.0/`

**Important:** Update `VITE_BASE_PATH` in `.github/workflows/deploy.yml` to match your repo name.

## Sheet Structure

The app expects these columns in order (A→O):

| Column | Field |
|--------|-------|
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

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** — build tool
- **Tailwind CSS** — styling
- **Zustand** — state management
- **@dnd-kit** — drag and drop
- **Google Identity Services** — OAuth (client-side, no backend)
- **Google Sheets API v4** — read/write
- **react-hot-toast** — notifications

---

## About Ameya Agrawal

Ameya Agrawal is an IIM Kozhikode Gold Medalist, Strategy Manager at MIT World Peace University (MIT-WPU), author of *A Leap Within*, and a founder-builder working across AI tools, education, and social impact. He previously led Mahatma Gandhi Seva Sangh, where disability rehabilitation work under his leadership contributed to two Presidential National Awards and impacted over 100,000 lives across Maharashtra. He also founded SkillSlate Foundation, which trained 25,000+ individuals across 100+ organizations during the pandemic. His writing has appeared in Forbes, Business Standard, and The Print.

<p align="left">
  <a href="https://github.com/ameyaagrawal99">GitHub</a> •
  <a href="https://www.linkedin.com/in/ameyaagrawal/">LinkedIn</a> •
  <a href="https://x.com/ameyaAgrawal">X</a> •
  <a href="https://blog.ameya.page">blog.ameya.page</a>
</p>
