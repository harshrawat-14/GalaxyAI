// ============================================================
// NODE DATA TYPES — strict, exhaustive, no `any`
// ============================================================

export type HandleType = 'text' | 'image' | 'video' | 'number'

export interface HandleMeta {
  id: string
  label: string
  type: HandleType
  required: boolean
}

// ─── Text Node ───────────────────────────────────────────────
export interface TextNodeData {
  [key: string]: unknown
  type: 'text'
  label: string
  content: string
  isRunning: boolean
}

// ─── Upload Image Node ────────────────────────────────────────
export interface UploadImageNodeData {
  [key: string]: unknown
  type: 'upload-image'
  label: string
  imageUrl: string | null
  fileName: string | null
  isRunning: boolean
}

// ─── Upload Video Node ────────────────────────────────────────
export interface UploadVideoNodeData {
  [key: string]: unknown
  type: 'upload-video'
  label: string
  videoUrl: string | null
  fileName: string | null
  isRunning: boolean
}

// ─── LLM Node ────────────────────────────────────────────────
export type GroqModel =
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-8b-instant'
  | 'mixtral-8x7b-32768'
  | 'gemma2-9b-it'
  | 'meta-llama/llama-4-scout-17b-16e-instruct'
  | 'meta-llama/llama-4-maverick-17b-128e-instruct'

export interface LLMNodeData {
  [key: string]: unknown
  type: 'llm'
  label: string
  model: GroqModel
  systemPrompt: string
  userMessage: string
  result: string | null
  isRunning: boolean
  error: string | null
}

// ─── Crop Image Node ─────────────────────────────────────────
export interface CropImageNodeData {
  [key: string]: unknown
  type: 'crop-image'
  label: string
  imageUrl: string | null
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
  resultUrl: string | null
  isRunning: boolean
  error: string | null
  connectedInputs: Record<string, boolean>
}

// ─── Extract Frame Node ───────────────────────────────────────
export interface ExtractFrameNodeData {
  [key: string]: unknown
  type: 'extract-frame'
  label: string
  videoUrl: string | null
  timestamp: string
  resultUrl: string | null
  isRunning: boolean
  error: string | null
  connectedInputs: Record<string, boolean>
}

// ─── Union ───────────────────────────────────────────────────
export type NodeData =
  | TextNodeData
  | UploadImageNodeData
  | UploadVideoNodeData
  | LLMNodeData
  | CropImageNodeData
  | ExtractFrameNodeData

export type NodeType = NodeData['type']

// Type-safe connection rules
export const CONNECTION_RULES: Record<string, HandleType[]> = {
  // LLM node inputs
  'llm::system_prompt': ['text'],
  'llm::user_message':  ['text'],
  'llm::images':        ['image'],
  // Crop image inputs
  'crop-image::image_url':       ['image'],
  'crop-image::x_percent':       ['text', 'number'],
  'crop-image::y_percent':       ['text', 'number'],
  'crop-image::width_percent':   ['text', 'number'],
  'crop-image::height_percent':  ['text', 'number'],
  // Extract frame inputs
  'extract-frame::video_url': ['video'],
  'extract-frame::timestamp': ['text', 'number'],
}

// Output handle types per node
export const OUTPUT_HANDLE_TYPES: Record<NodeType, HandleType> = {
  'text':          'text',
  'upload-image':  'image',
  'upload-video':  'video',
  'llm':           'text',
  'crop-image':    'image',
  'extract-frame': 'image',
}
