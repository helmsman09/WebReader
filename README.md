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
- **Shared types** (`@news-capture/types`)

Wire your MongoDB, Redis, and `OPENAI_API_KEY` in `backend/.env`, build the packages, then:

- `cd backend && npm run dev` (API)
- `npm run worker:summary` + `npm run worker:tts` (workers)
- `cd dashboard && npm run dev` (web UI)
- `cd extension && npm run build` (load `dist` as unpacked extension)
- `cd mobile && npm run start` (Expo app)

---

## 1. Install & bootstrap

```bash
cd news-reading-monorepo

# root workspace install
npm install
```

This installs deps for:

- `backend`
- `dashboard`
- `mobile`
- `types`
- `extension`

---

## 2. Environment setup

### 2.1 Mongo + Redis

- MongoDB (e.g. `mongodb://localhost:27017`)
- Redis (e.g. `redis://127.0.0.1:6379`)

### 2.2 Backend `.env`

Create `backend/.env`:

```bash
MONGODB_URI=mongodb://localhost:27017/news_capture
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
PORT=4000

# OpenAI for summaries + TTS
OPENAI_API_KEY=sk-...

# Optional: limit TTS jobs per minute
TTS_MAX_JPM=30
```

Create a test user in Mongo:

```js
db.users.insertOne({
  email: "you@example.com",
  apiKey: "dev_api_key_123",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

## 3. Backend: API, summaries, and TTS

From repo root:

```bash
cd backend
npm run dev
```

This starts Express at `http://localhost:4000`.

### 3.1 Key routes

- `GET /health`
- `GET /api/me/pages?tag=TAG` – list pages for current user
- `GET /api/me/tags` – tag stats
- `PATCH /api/pages/:id/tags` – update tags
- `POST /api/uploads/text` – upload text-only
- `POST /api/uploads/pdf` – upload **PDF**, parsed via `pdf-parse`
- `POST /api/uploads/audio` – upload audio-only
- `POST /api/uploads/page` – upload block-structured page (extension & custom pages)
- `POST /api/pages/:id/summary` – queue summary job (OpenAI)
- `POST /api/pages/:id/tts` – queue TTS job (OpenAI)

New pages auto-enqueue a **summary** job if they contain text.

### 3.2 Real PDF parsing (`pdf-parse`)

- `POST /api/uploads/pdf` accepts `multipart/form-data`:
  - `file`: PDF
  - `title` (optional)
  - `tags` (optional, comma-separated)
  - `sharingMode` (`private` | `unlisted` | `shared`)
  - `meta` (optional JSON for PageMeta)

The backend:

1. Reads the uploaded PDF file.
2. Uses `pdf-parse` to extract text.
3. Wraps text into a single paragraph block.
4. Populates `mainText`, `paragraphs`, `images` (empty).
5. Saves a `Page` with `sourceType="uploaded-pdf"`.
6. Enqueues a summary job.

### 3.3 Summary worker (OpenAI Chat)

Worker entry: `backend/src/workers/summaryWorker.ts`.

Run it in another terminal:

```bash
cd backend
npm run worker:summary
```

Behavior:

- Listens on `summary-queue`.
- For each page:
  - Uses `openai.chat.completions.create` with `gpt-4.1-mini`.
  - Prompts: 3–6 bullet points of key facts/numbers/takeaways.
  - Stores:
    - `page.summary`
    - `page.summaryProvider = "openai"`
    - `page.summaryCreatedAt = <ISO datetime>`

### 3.4 TTS worker (OpenAI Audio TTS)

Worker entry: `backend/src/workers/ttsWorker.ts`.

Run it in another terminal:

```bash
cd backend
npm run worker:tts
```

Behavior:

- Listens on `tts-queue`, with rate limiting via `TTS_MAX_JPM`.
- For each page:
  - Uses `openai.audio.speech.create` with `model="gpt-4o-mini-tts"`.
  - Maps your `voiceProfile` (`boy|girl|man|woman`) to a provider voice.
  - Gets back an MP3 buffer.
  - Calls `uploadAudioAndGetUrl` (stub) to get an `audioUrl`.
  - Writes:
    - `page.tts` (url, profile, provider, createdAt)
    - Appends an `AUDIO_TTS` entry in `page.audioSources`.

> Notes:
> - You must plug in real storage (S3/GCS/etc.) in `uploadAudioAndGetUrl`.
> - You can tune concurrency, backoff, and attempts in `queues/queues.ts`.

Trigger TTS manually:

```http
POST /api/pages/:id/tts
Authorization: Bearer dev_api_key_123
Content-Type: application/json

{ "voiceProfile": "man" }
```

---

## 4. Dashboard (web)

From repo root:

```bash
cd dashboard
npm run dev
```

Open the dev server (default: `http://localhost:5173`).

### 4.1 API key

In browser dev console:

```js
localStorage.API_KEY = "dev_api_key_123";
location.reload();
```

### 4.2 Summary view

On the right-hand side:

- A **Summary** card:
  - Shows `page.summary` (if present).
  - Displays provider + last-updated time.
  - `Re-summarize` button:
    - Calls `POST /api/pages/:id/summary`.
    - Clears local summary while a new one is being generated.

Summaries are rendered as plain text. If your model returns bullet points, they render nicely with newlines.

### 4.3 Upload modal

Click **“+ New”**:

- Choose template:
  - Text/PDF, Image top, Image flow, Audio.
- Modes:
  - `text` → `/api/uploads/text`
  - `pdf` → `/api/uploads/pdf` (with `pdf-parse`)
  - `audio` → `/api/uploads/audio`
  - `blocks` → `/api/uploads/page` with `blocks[]` and `layoutTemplate`

Meta fields:

- `metaDescription`
- `siteName`

These feed into **PageMeta** so your own uploads show rich cards just like web captures.

---

## 5. Chrome extension (Vite + React + OG/meta)

From repo root:

```bash
cd extension
npm run build
```

Load in Chrome:

1. Go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the `extension/dist` folder.

Popup configuration:

- Backend URL: `http://localhost:4000`
- API key: `dev_api_key_123`
- Default sharing: `private | unlisted | shared`

Capture flow:

1. On a news page, click **“Capture this page”**.
2. Content script:
   - Heuristics to find the main story.
   - Filters out nav/aside/footers/obvious ad containers.
   - Collects blocks:
     - `heading` (`<h1>`–`<h3>`)
     - `paragraph` (`<p>`, lists, larger text nodes)
     - `image` (`<img>`)
     - `audio` (`<audio>`)
   - Extracts OpenGraph/meta:

     - `og:title`, `og:description`, `og:image`
     - `twitter:title`, `twitter:description`, `twitter:image`
     - `<meta name="description">`
     - site name from `og:site_name` or hostname

3. Background script POSTs to `/api/uploads/page` with `blocks` + `meta`.

Dashboard then shows:

- Cards with image, site name, description.
- Summary panel (once worker finishes).
- Full content with images/audio.

---

## 6. Mobile (Expo skeleton)

From repo root:

```bash
cd mobile
npm install  # if needed
npm run start
```

Fill your API key in the screens where the comment says `// fill from secure storage`.

Screens:

- **Library**:
  - `GET /api/me/pages`
  - Simple list of pages + tags.
- **AddContent**:
  - Upload text, PDF, or audio to the same backend routes.
- **PageDetail**:
  - Shows title, URL, **summary** (if available), and `mainText`.

---

## 7. Verifying the new pieces

1. **Summaries**
   - Start backend + Mongo + Redis.
   - Start `worker:summary`.
   - Capture a new article via the extension, or upload text/PDF.
   - In Mongo, watch `pages.summary` be filled.
   - In the dashboard, the **Summary** card should show bullet points.

2. **PDF parsing**
   - Start backend.
   - In dashboard → `+ New`:
     - Template: Text/PDF.
     - Mode: `pdf` (select a PDF).
   - After upload:
     - Open the page from the sidebar.
     - You should see extracted text in the reader.
     - A summary will be generated automatically.

3. **TTS**
   - Start backend + `worker:tts`.
   - Trigger `POST /api/pages/:id/tts`.
   - Worker logs should show an OpenAI TTS call + stub upload.
   - The page should get a `tts` object and an additional `audioSources` entry.

---

This monorepo now gives you:

- Summaries (OpenAI) with UI.
- Real PDF parsing (pdf-parse).
- Real TTS provider (OpenAI) wired via queues.

You can now focus on UX / product-level iterations—e.g., per-user streaks, reading-time analytics, sharing flows, or transcript-fusion UIs—on top of a working capture/summarize/tts stack.
