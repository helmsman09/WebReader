# News Reading Monorepo

This monorepo includes:

- **Backend** (Express + MongoDB + Redis + BullMQ)
  - Capture pages (text, PDF, audio, block-structured pages)
  - Real PDF parsing (`pdf-parse`)
  - Summary worker (OpenAI chat) + `/api/pages/:id/summary`
  - TTS worker (OpenAI audio) + `/api/pages/:id/tts`
- **Dashboard** (React + Vite)
  - Page list with OG/meta cards
  - Tag editor
  - **Summary panel** (with Re-summarize button)
  - **TTS panel** (choose voice and queue TTS, with audio player)
  - Upload modal (text, PDF, audio, custom blocks)
- **Mobile** (React Native / Expo, skeleton)
  - Library view
  - AddContent screen (text/PDF/audio)
  - **PageDetail**:
    - Summary view + Re-summarize button
    - **TTS controls** (voice chips + Generate TTS)
- **Chrome extension** (Vite + React)
  - Popup for backend URL/API key/sharing mode
  - Content script: cleaned article blocks + images + audio + OG/meta
  - Background: POST to `/api/uploads/page`

Wire your MongoDB, Redis, and `OPENAI_API_KEY` in `backend/.env`, build the packages, then:

- `cd backend && npm run dev` (API)
- `npm run worker:summary` + `npm run worker:tts` (workers)
- `cd dashboard && npm run dev` (web UI)
- `cd extension && npm run build` (load `dist` as unpacked extension)
- `cd mobile && npm run start` (Expo app)
