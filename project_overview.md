# fmp-client — Project Overview

## What Is This?

**StreamCut** (a.k.a. ClipAI) is an AI-powered video clipping SaaS built for content creators, social media managers, and digital marketers. Users upload long-form videos, the AI analyzes them to identify the single best viral short-form clip (~45–57 seconds), processes the clip via AWS Lambda, and the user can then edit it with customizable captions before exporting via Remotion.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, JS) |
| UI Styling | **Tailwind CSS v4** |
| Auth | **Clerk** (`@clerk/nextjs`) |
| Database | **Supabase** (PostgreSQL) |
| File Storage | **AWS S3** |
| Video Processing | **AWS Lambda** (custom function) |
| AI Analysis | **Google Gemini** (`@google/genai`) |
| Video Rendering/Export | **Remotion + Remotion Lambda** |
| Billing | **Clerk PricingTable** |

---

## App Architecture

```
/app
├── page.js              ← Public landing page (StreamCut brand)
├── layout.js            ← Root layout (ClerkProvider, Geist font)
├── globals.css          ← Global Tailwind styles
│
├── dashboard/
│   ├── page.jsx         ← Redirects to v2
│   └── v2/page.jsx      ← Main authenticated dashboard
│
├── clips/
│   └── v2/[videoId]/page.jsx  ← AI clips review + caption editor page
│
├── editor/
│   └── [id]/page.js     ← (Legacy/separate) video editor
│
├── purchase-success/    ← Post-Clerk checkout success page
│
├── components/
│   ├── CaptionEditor.jsx     ← Full caption editing UI component
│   ├── VideoComposition.jsx  ← Remotion composition wrapper
│   └── VideoUploader.jsx     ← File upload component
│
├── contexts/
│   ├── AlertContext.jsx      ← Global alert state
│   └── RenderContext.jsx     ← Rendering state management
│
├── utils/
│   └── parseSubtitles.js    ← Subtitle timestamp parser
│
└── api/                 ← All Next.js API routes
    ├── upload/          ← GET (history) + POST (presigned S3 URL + DB record)
    ├── video/[videoId]/ ← GET (ownership check → S3 redirect)
    ├── video_processing/[videoId]/ ← POST (AI analysis + Lambda trigger)
    ├── export/          ← POST (Remotion Lambda render job)
    ├── credits/         ← Credit balance management
    ├── memes/           ← (Unknown — likely meme overlay feature)
    ├── thumbnail/       ← Thumbnail generation/retrieval
    ├── webhook/clips/   ← Webhook receiver for Lambda processing status
    └── api/video/output/ + subtitles/  ← Output/subtitle delivery routes
│
/server                  ← Backend Python/Node scripts & functions
├── face_detector/       ← Face detection utilities
├── lambda/              ← AWS Lambda handlers
├── video_compressor/    ← Video compression logic
└── video_engine/        ← Core video processing engine
```

---

## Core User Flow

```
1. Landing Page (/)
   └─ Sign in via Clerk → Redirected to /dashboard

2. Dashboard (/dashboard/v2)
   ├─ View uploaded videos (fetched from Supabase `videos` table)
   ├─ See AI credits balance (from `user_credits` table)
   ├─ Upload new video:
   │   ├─ Client generates thumbnail (canvas frame extract)
   │   ├─ POST /api/upload → gets presigned S3 URL
   │   ├─ XHR PUT directly to S3 (with progress tracking)
   │   └─ DB record inserted in Supabase `videos`
   └─ "Make AI Clips" → navigates to /clips/v2/[videoId]

3. AI Clips Page (/clips/v2/[videoId])
   ├─ POST /api/video_processing/[videoId]:
   │   ├─ Sends video to Gemini AI (video URL + detailed prompt)
   │   ├─ AI returns: recommended clip (start/end time) + full subtitles
   │   ├─ Stores result in `video_processing_req` table
   │   └─ Triggers AWS Lambda to cut + process the clip
   ├─ Webhook (/api/webhook/clips) receives Lambda completion callback
   └─ User sees processed clip + can edit captions in CaptionEditor

4. Caption Editor (CaptionEditor.jsx)
   ├─ Edit subtitle text, timing, style
   ├─ Preview via Remotion Player
   └─ Export → POST /api/export → Remotion Lambda renders final video
```

---

## Key Data Models (Supabase)

| Table | Purpose |
|---|---|
| `videos` | Uploaded video metadata (S3 key, URL, duration, thumbnail, credits used) |
| `video_processing_req` | AI processing state per video (`status`, `ai_analysis` JSON) |
| `video_processing_logs` | Step-by-step processing log entries |
| `user_credits` | Credit balance per Clerk user (`balance`, `plan`, `plan_credits`) |

**Credit system**: 1 credit = 1200 seconds of video. Cost = `duration / 1200`. Deducted via Supabase RPC `deduct_credits`.

---

## AI Integration (Gemini)

- Model: `gemini-3.1-flash-lite` (with `gemini-2.5-pro` commented out)
- Input: Raw video URL (from S3) + detailed system prompt
- Output (structured JSON schema):
  - `recommended_shorts`: Exactly 1 clip with `start_time`, `end_time`, `duration_seconds` (45–57s), `title_or_hook`, `rationale`
  - `full_subtitles`: Timestamped subtitle string (normalized to clip start = `00:00:00.000`, max 5 words/segment)

---

## AWS Infrastructure

| Resource | Purpose |
|---|---|
| S3 Bucket `fmp-641079926683-us-east-1-an` | Stores raw videos (`raw_videos/`), thumbnails (`thumbnail/`), and processed outputs (`processed_videos/`) |
| AWS Lambda (custom URL) | Video cutting/processing engine (FFmpeg-based, invoked via POST) |
| Remotion Lambda | Cloud rendering of captioned videos |

---

## Remotion Setup

- `remotion/Root.jsx` — Root composition file
- `remotion/index.js` — Entry point
- Export API calls `renderMediaOnLambda` with composition `"CaptionComposition"` and props: `videoUrl`, `captions`, `words`, `overlays`, `fontSize`, `verticalPosition`, `brolls`, `bgMusicSrc`, `hook`, `theme`

---

## Auth & Access Control

- **Clerk** handles all auth (modal sign-in, `useAuth`, `auth()` on server)
- All API routes verify `userId` from Clerk before accessing Supabase
- Dashboard and clip pages show locked/auth screens if unauthenticated
- **Billing**: Clerk `PricingTable` on landing page with checkout redirects (`/purchase-success`)

---

## Design System

Defined in `DESIGN.md` as "Lumina AI" design tokens:
- **Brand**: Corporate/Modern + subtle Glassmorphism
- **Primary color**: Deep blue (`#0058bc`)
- **Accents**: Neon purple (`#A855F7`) for AI features, Teal (`#14B8A6`) for status
- **Font**: Inter exclusively
- **Spacing**: 4px baseline grid, 1280px max-width container
- Tailwind custom tokens in `tailwind.config.js` (brand-primary, brand-neon-purple, brand-vibrant-teal, brand-border-subtle, brand-surfaceBg, etc.)

---

## Files of Note

| File | Role |
|---|---|
| `app/page.js` | Landing page — Hero, features, pricing, FAQ, CTA (inline styles) |
| `app/dashboard/v2/page.jsx` | Dashboard — upload, history, credits, video cards |
| `app/api/upload/route.js` | Core upload pipeline (presigned S3 URL, credits, Supabase) |
| `app/api/video_processing/[videoId]/route.js` | AI + Lambda orchestration |
| `app/api/export/route.js` | Remotion Lambda render trigger |
| `app/components/CaptionEditor.jsx` | Caption editing UI (51KB — most complex component) |
| `DESIGN.md` | Complete design token reference |
| `.env.local` | All secrets (Clerk, AWS, Supabase, Gemini, Pixabay) |

---

## Feature Updates & Changelog

*(Per the strict project rules, any new features, edits, or updates MUST be logged here to maintain an up-to-date project overview.)*

- **[2026-07-15]**: Improved UX feedback for video rendering and uploading. Replaced basic native alerts in `GeneratedClipPreview.jsx` with detailed custom UI alerts (via `useAlert`), informing users that they can safely leave the page while YouTube processes the upload in the background. Updated the global `RenderContext.jsx` toast UI to explicitly display "Rendered! Uploading to YouTube..." so users understand the backend processing delay.
- **[2026-07-15]**: Fixed three video processing bugs: 1) Increased render quality by configuring `crf: 17` and `jpegQuality: 100` in Remotion Lambda payload. 2) Fixed a bug where clips rendered at 15 seconds by properly falling back to AI-suggested duration (`aiMeta.duration_seconds`) instead of a hardcoded 450 frames. 3) Fixed YouTube scheduling failures by ensuring the `publishAt` date is safely shifted at least 15 minutes into the future if the scheduled time passes during rendering.
- **[2026-07-15]**: Fixed a bug where YouTube uploads were not triggered after a successful Remotion render if the user stayed on the preview page or calendar. Added a trigger in `RenderContext.jsx` to call `/api/export/poll` immediately upon render completion for post jobs.
- **[2026-07-15]**: Established strict documentation rules. The `project_overview.md` file is now the central source of truth and must be updated automatically upon feature changes. Included `contexts` and `server` folders in the documented project architecture.
