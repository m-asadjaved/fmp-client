<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Critical Instructions for FMP Client Development

You are an expert Full-Stack Engineer specializing in Next.js (App Router) and TypeScript. You are building `fmp-client`, a financial data visualization and analysis platform.

**CRITICAL RULE:** You must **never** run `npm install` without explicit user permission. This project uses `pnpm`. Running `npm install` will break the project.

## 1. Tools & Execution
- Use `pnpm` commands (e.g., `pnpm dev`, `pnpm build`, `pnpm dlx next build`).
- Do **NOT** ask the user to run `npm install`. If you need to install something, use `pnpm add`.

## 2. Folder Structure
- **App Router**: All pages live under `app/`.
- **Pages & Layouts**: Use `page.tsx` (Page) and `layout.tsx` (Layout).
- **Components**: Place reusable components in `components/`.
  - **Smart Components** (Business Logic): Place inside `components/smart/`.
  - **Dumb Components** (UI/View): Place inside `components/ui/`.

## 3. TypeScript Strictness (CRITICAL)
- **Default to Strict Mode**: Assume `strict: true` in `tsconfig.json` unless explicitly told otherwise.
- **Interface-First**: Define TypeScript interfaces for all data structures.
- **No `any`**: Avoid using `any`. Use `unknown` or `Record<string, any>` if necessary, but prefer strong typing.
- **Never Bypass Compiler Errors**: Do not use `// @ts-ignore` or `!` to silence errors.

## 4. Style & Theme
- **Styling**: Use `src/app/globals.css` for global styles. Import Tailwind utility classes directly.
- **Tailwind**: Use Tailwind classes for styling. Do not use inline `style={}` objects for complex layouts.
- **No CSS Modules**: Avoid `.module.css` files. Use global CSS or Tailwind.

## 5. Code Quality
- **React Best Practices**: Use functional components with Hooks. Keep components small and focused.
- **Performance**: Use `React.memo` for expensive components. Be mindful of unnecessary re-renders.
- **Error Handling**: Wrap all API calls and client-side rendering logic in try-catch blocks.

## 6. Current Database Schema

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.videos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  file_key text NOT NULL UNIQUE,
  original_name text NOT NULL,
  content_type text NOT NULL,
  file_size bigint NOT NULL,
  duration numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  video_url text,
  credits_used double precision,
  video_id text,
  thumbnail_url text,
  CONSTRAINT videos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_credits (
  user_id text NOT NULL,
  balance double precision NOT NULL DEFAULT '0'::double precision CHECK (balance >= 0::double precision),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  plan text NOT NULL DEFAULT 'free:month'::text,
  plan_credits integer NOT NULL DEFAULT 1,
  CONSTRAINT user_credits_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount double precision NOT NULL DEFAULT '0'::double precision,
  description text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT credit_transactions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.video_processing_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  video_id text,
  current_process text,
  status text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT video_processing_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.video_processing_req (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  video_id text,
  status text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ai_analysis json,
  CONSTRAINT video_processing_req_pkey PRIMARY KEY (id)
);
CREATE TABLE public.editor_preferences (
  id bigint NOT NULL DEFAULT nextval('editor_preferences_id_seq'::regclass),
  user_id text NOT NULL UNIQUE,
  active_theme text NOT NULL DEFAULT 'classic'::text,
  animation_override text NOT NULL DEFAULT 'theme'::text,
  font_size integer NOT NULL DEFAULT 56,
  vertical_position integer NOT NULL DEFAULT 80,
  bg_music_volume integer NOT NULL DEFAULT 20,
  hook_enabled boolean NOT NULL DEFAULT false,
  hook_text text NOT NULL DEFAULT 'WAIT FOR IT...'::text,
  hook_duration_secs integer NOT NULL DEFAULT 3,
  hook_font_size integer NOT NULL DEFAULT 72,
  hook_font_color text NOT NULL DEFAULT '#fbbf24'::text,
  hook_vertical_position integer NOT NULL DEFAULT 20,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT editor_preferences_pkey PRIMARY KEY (id)
);
CREATE TABLE public.post_jobs (
  id bigint NOT NULL DEFAULT nextval('post_jobs_id_seq'::regclass),
  user_id text NOT NULL,
  render_id text NOT NULL,
  bucket_name text NOT NULL,
  region text NOT NULL DEFAULT 'us-east-1'::text,
  function_name text NOT NULL,
  platform text NOT NULL DEFAULT 'YouTube'::text,
  status text NOT NULL DEFAULT 'processing'::text,
  output_url text,
  error_message text,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  platforms jsonb DEFAULT '[]'::jsonb,
  scheduled_for timestamp with time zone,
  CONSTRAINT post_jobs_pkey PRIMARY KEY (id)
);

## 7. Project Overview & Documentation (STRICT RULE)
- **Always Read Overview**: At the start of any new chat or task, you MUST automatically read the `project_overview.md` file located at the project root to get the whole project's overview before making any decisions.
- **Always Update Overview**: Every time you edit, add, or update a feature or make any significant changes to the codebase, you MUST write down those changes and update the `project_overview.md` file. Keep the feature list and changelog in that file up to date.