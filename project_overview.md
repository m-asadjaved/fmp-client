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
| Billing | **Paddle Billing (Subscriptions & Tax)** |

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

Defined in `stripe-DESIGN.md` as "Stripe HDS Light" design tokens:
- **Brand**: Clean, high-contrast light theme with tight border radii and crisp shadows.
- **Primary color**: Soft teal/cyan (`brand-primary`)
- **Backgrounds**: White (`brand-surface`) and ultra-light gray (`brand-surfaceBg`)
- **Typography**: `sohne-var`, falling back to `SF Pro Display`, `Inter`. Font weights favor lighter styles (`300` for headings).
- Tailwind custom tokens in `tailwind.config.js` map these to internal variables (e.g., `brand-primary`, `brand-secondary`, `brand-surface`, `brand-on-surface-variant`).

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

Defined in `stripe-DESIGN.md` as "Stripe HDS Light" design tokens:
- **Brand**: Clean, high-contrast light theme with tight border radii and crisp shadows.
- **Primary color**: Soft teal/cyan (`brand-primary`)
- **Backgrounds**: White (`brand-surface`) and ultra-light gray (`brand-surfaceBg`)
- **Typography**: `sohne-var`, falling back to `SF Pro Display`, `Inter`. Font weights favor lighter styles (`300` for headings).
- Tailwind custom tokens in `tailwind.config.js` map these to internal variables (e.g., `brand-primary`, `brand-secondary`, `brand-surface`, `brand-on-surface-variant`).

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
- **[2026-07-16]**: Added a compute and cost-efficient S3 polling mechanism to display real-time video compression statuses on the dashboard. Created a Next.js API route (`/api/upload/compression-status`) to batch check S3 `HeadObject` for compressed outputs, and updated the UI to show a dynamic processing spinner over newly uploaded videos until the Fargate task completes.
- **[2026-07-18]**: Fixed a rendering bug where split screen configurations (such as gameplay layouts) were being ignored by Remotion. The `splitTemplate`, `splitPosition`, `splitScale`, `splitX`, and `splitY` properties were missing from the destructured payload in the `/api/export` and `/api/export/post` API routes, causing them to fall back to the default `null` state during lambda execution. These properties are now properly passed to `renderMediaOnLambda`.
- **[2026-07-18]**: Fixed `MediaPlaybackError` (CORS / 403 Forbidden) when playing video templates and memes in the local browser. Refactored `/api/splits` and `/api/memes` to dynamically generate AWS S3 Presigned URLs instead of returning hardcoded S3 bucket URLs.
- **[2026-07-18]**: Added local storage persistence (`fmp_split_settings`) for split-screen layout preferences across `CaptionEditor.jsx` and `GeneratedClipPreview.jsx` so that users do not need to re-select their templates and positioning between sessions.
- **[2026-07-18]**: Upgraded the subtitle generation architecture to use the live ElevenLabs Scribe v2 API (`scribe_v2`) for high-accuracy batch transcription, replacing the previous hardcoded mock responses in `/api/video/subtitles/v2/[id]/route.js`. The application now fetches the processed audio from S3 and pipes it directly to ElevenLabs for frame-accurate word-level timestamps.
- **[2026-07-18]**: Optimized ElevenLabs API usage and costs by switching from full-video STT to per-clip STT generation. The frontend now fetches STT specifically for generated clips, and the backend securely caches the ElevenLabs JSON responses in the `video_processing_req` database row (`ai_analysis.recommended_shorts[clipIndex].stt_data`) to prevent redundant transcription costs.
- **[2026-07-18]**: Completely redesigned the Split Screen selection interface. Replaced the simple dropdown with a feature-rich `SplitScreenModal.jsx` that categorizes predefined gaming and ASMR videos. Added a "Your Uploads" tab that allows users to seamlessly upload their own custom gameplay backgrounds to S3 via presigned URLs and manage/delete them directly from the UI.
- **[2026-07-18]**: Modernized and improved the UI of all `input[type="range"]` sliders across the application (such as those in the Caption Editor and Split Screen configurations). Added custom WebKit and Firefox styling in `globals.css` with sleek neon purple thumbs, subtle borders, and smooth scaling/shadow animations on hover and active states.
- **[2026-07-18]**: Replaced plain text buttons for "Caption Theme" and "Animation Style" in the Caption Editor with rich visual previews. Themes now render a miniature "Aa" sample displaying the exact text shadow, active word color, and font weight. Animation styles now feature a dynamic animated icon utilizing custom CSS keyframes (`previewPop`, `previewSlide`, etc.) to demonstrate the effect on hover/active states seamlessly.
- **[2026-07-18]**: Fixed a bug where captions were not immediately visible at the start of a video due to initial gaps in the extracted timestamps. Modified `parseSubtitles.js` to automatically set the `startMs` of the very first caption line to `0` while retaining its proper `endMs`, ensuring the first caption covers the entirety of the beginning of the video.
- **[2026-07-18]**: Improved UI presentation on the AI clips review page by capping the displayed "Clip Subtitles" preview text to a maximum of 1000 characters. Added an interactive "view full subtitles" / "view less" toggle button (styled in brand indigo with an underline) so users can seamlessly expand or collapse long transcripts without cluttering the screen.
- **[2026-07-18]**: Refactored the dashboard Sidebar to improve Clerk settings navigation. The Clerk settings and sign-out menu are now intuitively triggered by clicking the gear (`Settings`) icon instead of the profile picture. The profile picture is now a static indicator of the logged-in user.
- **[2026-07-18]**: Fully transitioned the billing architecture from Clerk PricingTable to **Paddle.com**. Integrated `@paddle/paddle-js` into the frontend landing page to trigger secure overlay checkouts with Clerk `userId` tracking. Implemented a robust backend webhook handler (`/api/webhooks/paddle`) utilizing `@paddle/paddle-node` to verify signatures and securely sync subscription statuses and credit allocations to Supabase.
- **[2026-07-20]**: Replaced the entire project design system with the "Stripe HDS Light" theme. Shifted from a dark-themed UI to a clean, high-contrast light theme with a dynamic gradient mesh hero, tight corner radii (`rounded-md`, `rounded-xl`), and crisp drop shadows (`shadow-sm-bottom`, `shadow-md-card`). Updated `tailwind.config.js`, `globals.css` (with `@theme` directives), `layout.js` (for `sohne-var` and `SF Pro Display` typography), and refactored all landing page components (Hero, Features, Showcase, Pricing, FAQ) to adopt the new semantic variables (`brand-surface`, `brand-secondary`, etc.).
- **[2026-07-23]**: Removed the "Trusted by teams at leading companies and institutions" sub-heading text from `InfiniteLogoSlider.jsx` as requested via page feedback.
- **[2026-07-23]**: Removed the "Your Balance" badge/indicator from the AI Clips workspace preview setup card on `/dashboard/clips/v2/[videoId]/page.jsx`.
- **[2026-07-23]**: Styled `DashboardHeader.jsx` with a distinct `#f8fafd` quiet surface background, a crisp `#e2e8f0` bottom border, and clean card styling for metric pills to create clear visual separation from the main page background.
- **[2026-07-23]**: Applied the project theme gradient (`bg-gradient-to-r from-[#A855F7] to-[#ff6118]`) to the background of both header metric pills (Storage and Credits) in `DashboardHeader.jsx`.
- **[2026-07-23]**: Updated the plan badge in `DashboardHeader.jsx` to `font-black` (900 weight) gradient text and added visible `#e2e8f0` grey line separators between navigation links in `Sidebar.jsx`.
- **[2026-07-23]**: Added **Audio-Only AI Processing Mode** to the Clips setup page. Users can now choose between "Full Video" (sends the Gemini video URI) or "Audio Only" (downloads raw audio from `raw_audio/{videoId}` on S3, uploads it to the Gemini File API on-demand, and sends it with the appropriate audio MIME type). The UI shows a two-card toggle above the checkboxes. The backend `SummarizeUsingAI()` function now accepts a dynamic `fileUri` + `mimeType` + `mode`, serving a slightly different system prompt for audio-only mode focused on spoken content. Audio file discovery probes five common formats (mp3, m4a, flac, aac, wav).
- **[2026-07-23]**: Fixed a credit cost mismatch bug where the backend was computing `creditsCost` from the full video duration (`videoRow.duration`), but the frontend was computing it from the user-selected `trimRange`. Now the backend reads `trimRange` from the POST body and uses the same formula (`trimDuration <= 300 ? 5 : ceil(trimDuration/60)`). Also added float tolerance in the balance comparison (`Math.floor(balance * 100) / 100`) to prevent false "Insufficient Credits" rejections due to `double precision` floating-point arithmetic in Postgres.
- **[2026-07-24]**: Integrated direct YouTube download via external API in the backend ECS Python task (`main.py`). The `fmp-video-compressor.py` Lambda now accepts `youtube_url` and passes it to the ECS payload. If present, the Python task directly contacts the external API, polls for completion, streams the download to S3 without FFmpeg compression, and extracts the raw audio to `raw_audio/`. Uploads the raw video to both the input and output keys so the downstream clip engine logic functions perfectly.
- **[2026-07-24]**: Modernized the YouTube UI compilation flow in the frontend. Replaced the polling-based backend Next.js download logic with a direct invocation to the `fmp-video-compressor.py` AWS Lambda URL via `/api/youtube/process`. `YouTubePreview.jsx` now securely delegates the heavy lifting to Fargate and utilizes the S3 HeadObject polling mechanism (`/api/upload/compression-status`) to keep the user engaged until processing is fully complete.