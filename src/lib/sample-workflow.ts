import type { FlowNode, FlowEdge } from '@/types/workflow'
import type {
  UploadImageNodeData,
  CropImageNodeData,
  TextNodeData,
  LLMNodeData,
  UploadVideoNodeData,
  ExtractFrameNodeData,
} from '@/types/nodes'

/** Pre-built Product Marketing Kit Generator workflow */
export const SAMPLE_WORKFLOW: { nodes: FlowNode[]; edges: FlowEdge[] } = {
  nodes: [
    // Branch A ─────────────────────────────────────────────
    {
      id: 'node-upload-image',
      type: 'upload-image',
      position: { x: 80, y: 80 },
      data: {
        type: 'upload-image',
        label: 'Product Photo',
        imageUrl: null,
        fileName: null,
        isRunning: false,
      } satisfies UploadImageNodeData,
    },
    {
      id: 'node-crop',
      type: 'crop-image',
      position: { x: 360, y: 80 },
      data: {
        type: 'crop-image',
        label: 'Crop Product',
        imageUrl: null,
        xPercent: 10,
        yPercent: 10,
        widthPercent: 80,
        heightPercent: 80,
        resultUrl: null,
        isRunning: false,
        error: null,
        connectedInputs: { image_url: true },
      } satisfies CropImageNodeData,
    },
    {
      id: 'node-sys-prompt',
      type: 'text',
      position: { x: 80, y: 300 },
      data: {
        type: 'text',
        label: 'Marketing Persona',
        content:
          'You are a professional marketing copywriter. Generate a compelling one-paragraph product description.',
        isRunning: false,
      } satisfies TextNodeData,
    },
    {
      id: 'node-product-details',
      type: 'text',
      position: { x: 80, y: 440 },
      data: {
        type: 'text',
        label: 'Product Details',
        content:
          'Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.',
        isRunning: false,
      } satisfies TextNodeData,
    },
    {
      id: 'node-llm-1',
      type: 'llm',
      position: { x: 640, y: 200 },
      data: {
        type: 'llm',
        label: 'Generate Description',
        model: 'llama-3.3-70b-versatile',
        systemPrompt: '',
        userMessage: '',
        result: null,
        isRunning: false,
        error: null,
      } satisfies LLMNodeData,
    },
    // Branch B ─────────────────────────────────────────────
    {
      id: 'node-upload-video',
      type: 'upload-video',
      position: { x: 80, y: 620 },
      data: {
        type: 'upload-video',
        label: 'Product Demo Video',
        videoUrl: null,
        fileName: null,
        isRunning: false,
      } satisfies UploadVideoNodeData,
    },
    {
      id: 'node-extract',
      type: 'extract-frame',
      position: { x: 360, y: 620 },
      data: {
        type: 'extract-frame',
        label: 'Extract Mid Frame',
        videoUrl: null,
        timestamp: '50%',
        resultUrl: null,
        isRunning: false,
        error: null,
        connectedInputs: { video_url: true },
      } satisfies ExtractFrameNodeData,
    },
    // Convergence ──────────────────────────────────────────
    {
      id: 'node-social-prompt',
      type: 'text',
      position: { x: 640, y: 620 },
      data: {
        type: 'text',
        label: 'Social Media Persona',
        content:
          'You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.',
        isRunning: false,
      } satisfies TextNodeData,
    },
    {
      id: 'node-llm-2',
      type: 'llm',
      position: { x: 960, y: 400 },
      data: {
        type: 'llm',
        label: 'Final Marketing Post',
        model: 'llama-3.3-70b-versatile',
        systemPrompt: '',
        userMessage: '',
        result: null,
        isRunning: false,
        error: null,
      } satisfies LLMNodeData,
    },
  ],

  edges: [
    // Branch A connections
    {
      id: 'e1',
      source: 'node-upload-image',
      target: 'node-crop',
      sourceHandle: 'output',
      targetHandle: 'image_url',
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
      type: 'animated',
    },
    {
      id: 'e2',
      source: 'node-sys-prompt',
      target: 'node-llm-1',
      sourceHandle: 'output',
      targetHandle: 'system_prompt',
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
      type: 'animated',
    },
    {
      id: 'e3',
      source: 'node-product-details',
      target: 'node-llm-1',
      sourceHandle: 'output',
      targetHandle: 'user_message',
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
      type: 'animated',
    },
    {
      id: 'e4',
      source: 'node-crop',
      target: 'node-llm-1',
      sourceHandle: 'output',
      targetHandle: 'images',
      style: { stroke: '#f59e0b', strokeWidth: 2 },
      type: 'animated',
    },
    // Branch B connections
    {
      id: 'e5',
      source: 'node-upload-video',
      target: 'node-extract',
      sourceHandle: 'output',
      targetHandle: 'video_url',
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
      type: 'animated',
    },
    // Convergence connections
    {
      id: 'e6',
      source: 'node-social-prompt',
      target: 'node-llm-2',
      sourceHandle: 'output',
      targetHandle: 'system_prompt',
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
      type: 'animated',
    },
    {
      id: 'e7',
      source: 'node-llm-1',
      target: 'node-llm-2',
      sourceHandle: 'output',
      targetHandle: 'user_message',
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
      type: 'animated',
    },
    {
      id: 'e8',
      source: 'node-crop',
      target: 'node-llm-2',
      sourceHandle: 'output',
      targetHandle: 'images',
      style: { stroke: '#f59e0b', strokeWidth: 2 },
      type: 'animated',
    },
    {
      id: 'e9',
      source: 'node-extract',
      target: 'node-llm-2',
      sourceHandle: 'output',
      targetHandle: 'images',
      style: { stroke: '#06b6d4', strokeWidth: 2 },
      type: 'animated',
    },
  ],
}
