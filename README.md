# NextFlow — Visual LLM Workflow Builder

A Krea.ai-inspired visual workflow canvas that lets you compose and execute multi-modal AI pipelines entirely in the browser. Connect nodes, run Gemini LLM calls, upload images and videos to a CDN, crop frames, and track every run in the history sidebar.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Canvas | React Flow / @xyflow/react v12 |
| Auth | Clerk |
| Database | Prisma + Neon PostgreSQL |
| State | Zustand + zundo (undo/redo) + Immer |
| LLM | Groq (via `groq-sdk`, OpenAI-compatible API) |
| Background tasks | Trigger.dev SDK v4 |
| File uploads | Uppy v5 + Transloadit |
| Styling | Tailwind CSS v4 |
| UI primitives | Radix UI, Lucide icons, Sonner toasts |

---

## Features

- **Drag-and-drop canvas** — add Text, Upload Image, Upload Video, LLM, Crop Image, and Extract Frame nodes
- **Typed connections** — DAG validation prevents cycles and type-mismatched connections
- **Animated edges** — dashed purple edges with glow on selection
- **Undo / redo** — 50-step temporal history via zundo
- **Right-click context menu** — Run, Duplicate, or Delete any node
- **Per-node error boundaries** — one crashing node never takes down the canvas
- **Transloadit CDN uploads** — images and videos uploaded to a CDN with signed assembly params; falls back to local object URL if unconfigured
- **Workflow history sidebar** — live-polls run history every 3 s, skeleton loading state
- **Persistent workflows** — auto-saved to Neon PostgreSQL via Prisma

---

## Prerequisites

- Node.js ≥ 20
- A [Neon](https://neon.tech) PostgreSQL database
- A [Clerk](https://clerk.com) application
- A [Groq](https://console.groq.com) API key for LLM inference
- (Optional) A [Trigger.dev](https://trigger.dev) project for background FFmpeg tasks
- (Optional) A [Transloadit](https://transloadit.com) account for CDN uploads

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the table below into `.env.local` (or edit `.env`) and fill in real values.

| Variable | Required | Description | Where to get it |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk frontend key | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | ✅ | Clerk backend key | Clerk Dashboard → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ | Sign-in route (use `/sign-in`) | — |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ | Sign-up route (use `/sign-up`) | — |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | ✅ | Redirect after sign-in (use `/workflow`) | — |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | ✅ | Redirect after sign-up (use `/workflow`) | — |
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string | Neon Console → Connection Details |
| `GROQ_API_KEY` | ✅ | Groq API key (starts with `gsk_`) | [console.groq.com](https://console.groq.com) → API Keys |
| `TRIGGER_API_KEY` | ☑ optional | Trigger.dev secret key | Trigger.dev Dashboard → API Keys |
| `TRIGGER_API_URL` | ☑ optional | Trigger.dev API URL (default: `https://api.trigger.dev`) | — |
| `TRANSLOADIT_KEY` | ☑ optional | Transloadit account key | Transloadit Console → Credentials |
| `TRANSLOADIT_SECRET` | ☑ optional | Transloadit account secret | Transloadit Console → Credentials |
| `TRANSLOADIT_TEMPLATE_ID_IMAGE` | ☑ optional | Template ID for image uploads | Transloadit Console → Templates |
| `TRANSLOADIT_TEMPLATE_ID_VIDEO` | ☑ optional | Template ID for video uploads | Transloadit Console → Templates |
| `NEXT_PUBLIC_TRANSLOADIT_KEY` | ☑ optional | Same as `TRANSLOADIT_KEY` (client-side feature flag) | — |

> **Tip:** For image analysis, choose `meta-llama/llama-4-scout-17b-16e-instruct` or `meta-llama/llama-4-maverick-17b-128e-instruct` — these are Groq's vision-capable models. Text-only models (Llama 3, Mixtral, Gemma) will ignore connected image inputs.

### 3. Push the database schema

```bash
npx prisma db push
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to sign in.

---

## Running a production build

```bash
npm run build
npm start
```

---

## Deployment (Vercel)

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add every environment variable from the table above under **Settings → Environment Variables**.
4. Deploy. Vercel detects Next.js automatically.

> After deployment, add your Vercel domain to Clerk's **Allowed Origins** and update the Clerk redirect URLs if you changed them.

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── trigger/          # Trigger.dev SDK v4 metadata endpoint
│   │   ├── upload/signature/ # Signs Transloadit assembly params
│   │   └── workflow/
│   │       ├── route.ts          # Create / list workflows
│   │       ├── [id]/route.ts     # Get / update / delete a workflow
│   │       ├── [id]/run/         # Start a workflow run
│   │       ├── [id]/runs/        # Poll run history
│   │       └── execute-node/     # Execute a single node server-side
│   ├── workflow/             # Main canvas page (protected)
│   ├── sign-in/ sign-up/     # Clerk auth pages
│   └── page.tsx              # Landing redirect
├── components/
│   ├── canvas/
│   │   ├── WorkflowCanvas.tsx    # ReactFlow wrapper
│   │   └── edges/AnimatedEdge.tsx
│   ├── nodes/                # TextNode, LLMNode, UploadImageNode, …
│   └── sidebar/              # LeftSidebar (node palette) + RightSidebar (history)
├── store/
│   └── workflow-store.ts     # Zustand + zundo + Immer store
├── trigger/                  # Trigger.dev background tasks (LLM, crop, extract-frame)
├── lib/                      # Prisma client, Trigger.dev configure, utils
└── types/                    # Workflow and node TypeScript types
```

---

## User Guide

### Adding nodes

Drag any node type from the **left sidebar** onto the canvas, or click a node type to place it at a random position.

| Node | Purpose |
|---|---|
| **Text** | Static text input. Wire it into an LLM's user message handle. |
| **Upload Image** | Drop or click to upload an image. Uploads to CDN if Transloadit is configured; falls back to a local object URL. |
| **Upload Video** | Same as Upload Image but for video files. |
| **Run LLM** | Calls Groq. Choose from Llama, Mixtral, or Gemma models. Configure the system prompt and user message in-node. Vision-capable models accept image inputs. |
| **Crop Image** | Crops an image to a region specified by x/y/width/height percentages. Requires Trigger.dev runtime for FFmpeg. |
| **Extract Frame** | Extracts a single frame from a video at a given timestamp. Requires Trigger.dev runtime for FFmpeg. |

### Connecting nodes

Drag from an output handle (right side, colored dot) to a compatible input handle (left side). The canvas rejects:
- Connections that would create a cycle
- Type-mismatched connections (e.g. video output → image input)
- Duplicate connections to the same input handle

### Running a workflow

Use the **Run** button in the toolbar. Three modes are available:

| Mode | Description |
|---|---|
| **Full** | Executes all nodes in topological order |
| **Selection** | Executes only the currently selected nodes |
| **Single** | Right-click any node → **Run this node** |

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Delete` / `Backspace` | Delete selected nodes / edges |
| `Shift + drag` | Multi-select nodes |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| Scroll | Zoom |
| Middle-click / right-click drag | Pan |

### Node context menu

Right-click any node (or click the `···` button that appears on hover) for:
- **Run this node** — execute just this node
- **Duplicate** — clone the node at +40 px offset
- **Delete** — remove the node and all connected edges

### Workflow history

The **right sidebar** shows every run for the current workflow, polling every 3 seconds. Click a run to expand it and see per-node status, duration, and output preview.

---

## Known limitations

- **Crop Image** and **Extract Frame** nodes require a live Trigger.dev worker with FFmpeg available. Without it they return a placeholder message.
- Transloadit CDN uploads require real template IDs created in the Transloadit console. With placeholder values the signature endpoint omits `template_id` and files upload to a default bucket (may not transcode).
- Workflow execution runs each node sequentially in the API route — parallelism via Trigger.dev is only used for the FFmpeg nodes.
