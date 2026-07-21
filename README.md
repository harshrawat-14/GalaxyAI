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
│   │   ├── uploads/params/           # Signs Transloadit assembly params
│   │   ├── transloadit/webhook/      # Completes the crop task's wait token
│   │   ├── workflows/
│   │   │   ├── route.ts              # Create / list workflows
│   │   │   ├── [id]/route.ts         # Get / update / delete a workflow
│   │   │   └── [id]/runs/            # Create a run (phase 1) + run history
│   │   ├── runs/[runId]/route.ts     # Poll a single run
│   │   ├── runs/[runId]/start/       # Trigger the run (phase 2)
│   │   └── usage/                    # Daily usage counter for the Bal pill
│   ├── dashboard/                # Workflow list
│   ├── workflow/[id]/            # Main canvas page (protected by Clerk)
│   ├── sign-in/ sign-up/         # Clerk auth pages
│   └── page.tsx                  # Landing redirect
├── domain/                       # Pure, framework-free core
│   ├── dag.ts                        # Cycle checks, topo order, edge validation
│   ├── nodes.ts                      # Node registry: ports, config schemas
│   └── ports.ts                      # Port type-compatibility rules
├── components/
│   ├── canvas/                       # Canvas.tsx, RunController, toolbar, sidebar
│   ├── nodes/                    # RequestInputs, Gemini, CropImage, Response, StickyNote
│   ├── history/                  # Run history panel
│   └── workflow-detail/          # Playground / API / Preview tabs
├── store/
│   └── workflow-store.ts         # Zustand + zundo + Immer store
├── trigger/                      # Trigger.dev tasks
│   ├── orchestrate.ts                # Promise-graph run engine
│   ├── gemini.task.ts                # One Gemini generation
│   ├── crop.task.ts                  # FFmpeg crop + Transloadit upload
│   └── resolve.ts                    # Node input resolution
└── lib/                          # gemini.ts, transloadit.ts, sampleWorkflow.ts, …
```

---

## Node Reference

| Node | Purpose |
|---|---|
| **Request-Inputs** | Defines the workflow's entry fields (text / number / image). Each field becomes an output handle. Image fields upload via Transloadit and show a preview. |
| **Gemini** | Calls Gemini with a prompt, optional system prompt, and optional media (image / video / audio / file). Model and generation params are set in-node. |
| **Crop Image** | Crop an image to a region defined by x/y/width/height percentages (FFmpeg via Trigger.dev) |
| **Response** | The workflow's final output — accepts multiple inputs and returns them when the run finishes |
| **Sticky Note** | Canvas annotation; not part of execution |

### Connecting nodes

Drag from an output handle (right side) to a compatible input handle (left side). The canvas rejects:
- Connections that create a cycle
- Type-mismatched connections (e.g. video output → image input)
- Duplicate connections to the same single-input handle

### Running a workflow

| Mode | How | What executes |
|---|---|---|
| **Full** | Click **Run** in the toolbar | Every node in the graph |
| **Selection** | Select nodes, then click **Run selected** | Only the selected nodes |
| **Single node** | Click the ↺ button in a node's header | Only that node |

Selection and single-node runs execute **only the nodes you targeted** — the run
scope is never expanded to include upstream dependencies. When a targeted node
needs a value from a parent that is not in the run, that value is read from the
parent's most recent successful output (or its manually entered value) rather
than re-executing it. If neither exists, the node fails with a message naming
the input it couldn't resolve.

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
