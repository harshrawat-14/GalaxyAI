# NextFlow — Visual LLM Workflow Builder

A Krea.ai-inspired visual workflow canvas for composing and executing multi-modal AI pipelines in the browser. Connect nodes, run Gemini LLM calls, upload images and videos, crop frames, extract video frames, and track every run in the history sidebar.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Canvas | React Flow (`@xyflow/react`) |
| Auth | Clerk |
| Database | Prisma + Neon PostgreSQL |
| State | Zustand + zundo (undo/redo) + Immer |
| LLM | Google Gemini (`@google/generative-ai`) |
| Background tasks | Trigger.dev v3 |
| File uploads | Uppy + Transloadit |
| Styling | Tailwind CSS v4 |
| UI | Radix UI, Lucide icons, Sonner toasts |

---

## Features

- **Drag-and-drop canvas** — Text, Upload Image, Upload Video, Run LLM, Crop Image, Extract Frame nodes
- **Typed connections** — DAG validation prevents cycles and type-mismatched connections
- **Animated edges** — dashed colored edges with glow on selection
- **Undo / redo** — 50-step history via zundo
- **Right-click context menu** — Run, Duplicate, or Delete any node
- **Multi-image LLM inputs** — connect multiple image/frame outputs into one LLM node
- **Transloadit CDN uploads** — signed assembly params; falls back to local object URL if unconfigured
- **Workflow history sidebar** — live-polls run history every 3 s
- **Persistent workflows** — auto-saved to Neon PostgreSQL via Prisma
- **Sample workflow** — pre-built "Face Fusion" pipeline loaded on first visit

---

## Prerequisites

- Node.js ≥ 20
- A [Neon](https://neon.tech) PostgreSQL database
- A [Clerk](https://clerk.com) application
- A [Google AI Studio](https://aistudio.google.com) Gemini API key (billing enabled for image generation)
- (Optional) A [Trigger.dev](https://trigger.dev) project for FFmpeg background tasks
- (Optional) A [Transloadit](https://transloadit.com) account for CDN uploads

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/workflow
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/workflow

# Neon PostgreSQL
DATABASE_URL=postgresql://...

# Gemini (required — only LLM provider in production)
GEMINI_API_KEY=AIza...

# Trigger.dev (optional — required for Crop and Extract Frame nodes)
TRIGGER_API_KEY=tr_dev_...
TRIGGER_API_URL=https://api.trigger.dev
TRIGGER_PROJECT_REF=proj_...

# Transloadit (optional — required for CDN uploads)
TRANSLOADIT_KEY=...
TRANSLOADIT_SECRET=...
NEXT_PUBLIC_TRANSLOADIT_KEY=...
NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_ID_IMAGE=...
NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_ID_VIDEO=...
TRANSLOADIT_TEMPLATE_ID_IMAGE=...
TRANSLOADIT_TEMPLATE_ID_VIDEO=...

# Development mode — also enables Groq and HuggingFace model options in the UI
# Omit (or set to false) for production
DEVELOPMENT=true
NEXT_PUBLIC_DEVELOPMENT=true

# Groq (dev only)
GROQ_API_KEY=gsk_...

# HuggingFace (dev only)
HF_TOKEN=hf_...
```

### 3. Push the database schema

```bash
npx prisma db push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to sign in.

---

## LLM Providers

| Provider | Models | Available |
|---|---|---|
| **Gemini** | `gemini-2.5-flash`, `gemini-2.5-pro`, image models | Always (production + dev) |
| **Groq** | Llama, Mixtral, Gemma | Dev only (`DEVELOPMENT=true`) |
| **HuggingFace** | FLUX.1-schnell | Dev only (`DEVELOPMENT=true`) |

In production, only set `GEMINI_API_KEY`. The Groq and HuggingFace model options will not appear in the UI, and any attempt to call them server-side will return an error.

---

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.
2. Vercel auto-detects Next.js — no framework config needed.

### 3. Set environment variables

In **Settings → Environment Variables**, add every variable from the table below.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | ✅ | Clerk Dashboard → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | ✅ | `/workflow` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | ✅ | `/workflow` |
| `DATABASE_URL` | ✅ | Neon Console → Connection Details |
| `GEMINI_API_KEY` | ✅ | Google AI Studio → API Keys |
| `TRIGGER_API_KEY` | optional | Trigger.dev Dashboard → API Keys |
| `TRIGGER_API_URL` | optional | `https://api.trigger.dev` |
| `TRIGGER_PROJECT_REF` | optional | Trigger.dev Dashboard |
| `TRANSLOADIT_KEY` | optional | Transloadit Console → Credentials |
| `TRANSLOADIT_SECRET` | optional | Transloadit Console → Credentials |
| `NEXT_PUBLIC_TRANSLOADIT_KEY` | optional | Same value as `TRANSLOADIT_KEY` |
| `TRANSLOADIT_TEMPLATE_ID_IMAGE` | optional | Transloadit Console → Templates |
| `TRANSLOADIT_TEMPLATE_ID_VIDEO` | optional | Transloadit Console → Templates |
| `NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_ID_IMAGE` | optional | Same as above |
| `NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_ID_VIDEO` | optional | Same as above |

> Do **not** set `DEVELOPMENT` or `NEXT_PUBLIC_DEVELOPMENT` on Vercel — omitting them is what enables production mode (Gemini only).

### 4. Configure Clerk for your Vercel domain

1. In Clerk Dashboard → **Domains**, add your `*.vercel.app` URL (or custom domain).
2. In Clerk Dashboard → **Paths**, confirm the sign-in / sign-up URLs match what you set above.

### 5. Deploy

Click **Deploy**. Vercel will run `npx prisma generate && next build` automatically (configured in `vercel.json`).

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── upload/signature/     # Signs Transloadit assembly params
│   │   └── workflow/
│   │       ├── route.ts              # Create / list workflows
│   │       ├── [id]/route.ts         # Get / update / delete a workflow
│   │       ├── [id]/run/             # Start a workflow run
│   │       ├── [id]/runs/            # Poll run history
│   │       └── execute-node/         # Execute a single node server-side
│   ├── workflow/                 # Main canvas page (protected by Clerk)
│   ├── sign-in/ sign-up/         # Clerk auth pages
│   └── page.tsx                  # Landing redirect
├── components/
│   ├── canvas/
│   │   ├── WorkflowCanvas.tsx        # ReactFlow wrapper
│   │   └── edges/AnimatedEdge.tsx
│   ├── nodes/                    # TextNode, LLMNode, UploadImageNode, …
│   └── sidebar/                  # LeftSidebar (palette) + RightSidebar (history)
├── store/
│   └── workflow-store.ts         # Zustand + zundo + Immer store
├── trigger/                      # Trigger.dev background tasks (LLM, crop, extract-frame)
├── lib/
│   ├── llm-client.ts             # LLM routing (Gemini / Groq / HuggingFace)
│   ├── sample-workflow.ts        # Pre-built sample workflow + starter templates
│   └── utils.ts
└── types/                        # Workflow and node TypeScript types
```

---

## Node Reference

| Node | Purpose |
|---|---|
| **Text** | Static text input — wire into an LLM's system prompt or user message handle |
| **Upload Image** | Upload an image via Transloadit CDN (or local object URL as fallback) |
| **Upload Video** | Same as Upload Image but for video files |
| **Run LLM** | Call Gemini (or Groq/HuggingFace in dev). Accepts multiple image inputs. Choose model in-node. |
| **Crop Image** | Crop an image to a region defined by x/y/width/height percentages (FFmpeg via Trigger.dev) |
| **Extract Frame** | Pull a single frame from a video at a given timestamp (FFmpeg via Trigger.dev) |

### Connecting nodes

Drag from an output handle (right side) to a compatible input handle (left side). The canvas rejects:
- Connections that create a cycle
- Type-mismatched connections (e.g. video output → image input)
- Duplicate connections to the same single-input handle

### Running a workflow

| Mode | How |
|---|---|
| **Full** | Click **Run** in the toolbar |
| **Selection** | Select nodes first, then click Run |
| **Single node** | Right-click any node → **Run this node** |

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Delete` / `Backspace` | Delete selected nodes / edges |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| Scroll | Zoom |
| Middle-click drag | Pan |

---

## Known Limitations

- **Crop Image** and **Extract Frame** require a live Trigger.dev worker with FFmpeg. Without it they return a placeholder message.
- **Gemini image generation** (`gemini-2.5-flash-image` and similar) requires a billing-enabled Google AI project.
- Transloadit CDN uploads require real template IDs from the Transloadit console. With placeholder values, files may upload to a default bucket without transcoding.
