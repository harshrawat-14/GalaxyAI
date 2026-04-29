import type { FlowNode, FlowEdge } from '@/types/workflow'
import type {
  UploadImageNodeData,
  CropImageNodeData,
  TextNodeData,
  LLMNodeData,
  UploadVideoNodeData,
  ExtractFrameNodeData,
} from '@/types/nodes'

type Starter = { name: string; nodes: FlowNode[]; edges: FlowEdge[] }

/**
 * Mini starter templates — one per node category.
 * Used by sidebar quick-launch on the dashboard.
 */
export const STARTER_TEMPLATES: Record<string, Starter> = {
  /* ── Image: text → image-gen LLM ────────────────────────── */
  image: {
    name: 'Image Generation',
    nodes: [
      {
        id: 'st-text',
        type: 'text',
        position: { x: 100, y: 200 },
        data: {
          type: 'text',
          label: 'Image Prompt',
          content: 'A photorealistic sunset over snowy mountains, cinematic lighting',
          isRunning: false,
        } satisfies TextNodeData,
      },
      {
        id: 'st-llm',
        type: 'llm',
        position: { x: 460, y: 180 },
        data: {
          type: 'llm',
          label: 'Generate Image',
          model: 'black-forest-labs/FLUX.1-schnell',
          systemPrompt: '',
          userMessage: '',
          result: null,
          resultIsImage: true,
          isRunning: false,
          error: null,
        } satisfies LLMNodeData,
      },
    ],
    edges: [
      {
        id: 'st-e1',
        source: 'st-text',
        target: 'st-llm',
        sourceHandle: 'output',
        targetHandle: 'user_message',
        style: { stroke: '#6366f1', strokeWidth: 2 },
        type: 'animated',
      },
    ],
  },

  /* ── Video: upload → extract → describe ──────────────────── */
  video: {
    name: 'Video Workflow',
    nodes: [
      {
        id: 'st-upload-v',
        type: 'upload-video',
        position: { x: 80, y: 180 },
        data: {
          type: 'upload-video',
          label: 'Video',
          videoUrl: null,
          fileName: null,
          isRunning: false,
        } satisfies UploadVideoNodeData,
      },
      {
        id: 'st-extract',
        type: 'extract-frame',
        position: { x: 380, y: 180 },
        data: {
          type: 'extract-frame',
          label: 'Extract Frame',
          videoUrl: null,
          timestamp: '50%',
          resultUrl: null,
          isRunning: false,
          error: null,
          connectedInputs: { video_url: true },
        } satisfies ExtractFrameNodeData,
      },
      {
        id: 'st-llm',
        type: 'llm',
        position: { x: 700, y: 180 },
        data: {
          type: 'llm',
          label: 'Describe Frame',
          model: 'gemini-2.5-flash',
          systemPrompt: '',
          userMessage: 'Describe what is happening in this video frame.',
          result: null,
          resultIsImage: false,
          isRunning: false,
          error: null,
        } satisfies LLMNodeData,
      },
    ],
    edges: [
      {
        id: 'st-e1',
        source: 'st-upload-v',
        target: 'st-extract',
        sourceHandle: 'output',
        targetHandle: 'video_url',
        style: { stroke: '#ef4444', strokeWidth: 2 },
        type: 'animated',
      },
      {
        id: 'st-e2',
        source: 'st-extract',
        target: 'st-llm',
        sourceHandle: 'output',
        targetHandle: 'images',
        style: { stroke: '#06b6d4', strokeWidth: 2 },
        type: 'animated',
      },
    ],
  },

  /* ── Text: text → LLM ────────────────────────────────────── */
  text: {
    name: 'Text Workflow',
    nodes: [
      {
        id: 'st-text',
        type: 'text',
        position: { x: 100, y: 200 },
        data: {
          type: 'text',
          label: 'Message',
          content: 'Tell me a fun fact about quantum mechanics.',
          isRunning: false,
        } satisfies TextNodeData,
      },
      {
        id: 'st-llm',
        type: 'llm',
        position: { x: 460, y: 180 },
        data: {
          type: 'llm',
          label: 'Run LLM',
          model: 'gemini-2.5-flash',
          systemPrompt: '',
          userMessage: '',
          result: null,
          resultIsImage: false,
          isRunning: false,
          error: null,
        } satisfies LLMNodeData,
      },
    ],
    edges: [
      {
        id: 'st-e1',
        source: 'st-text',
        target: 'st-llm',
        sourceHandle: 'output',
        targetHandle: 'user_message',
        style: { stroke: '#6366f1', strokeWidth: 2 },
        type: 'animated',
      },
    ],
  },

  /* ── Run LLM: system + user → LLM ────────────────────────── */
  llm: {
    name: 'LLM Workflow',
    nodes: [
      {
        id: 'st-sys',
        type: 'text',
        position: { x: 80, y: 80 },
        data: {
          type: 'text',
          label: 'System Prompt',
          content: 'You are a concise, helpful assistant.',
          isRunning: false,
        } satisfies TextNodeData,
      },
      {
        id: 'st-user',
        type: 'text',
        position: { x: 80, y: 280 },
        data: {
          type: 'text',
          label: 'User Message',
          content: 'Explain backpropagation in two sentences.',
          isRunning: false,
        } satisfies TextNodeData,
      },
      {
        id: 'st-llm',
        type: 'llm',
        position: { x: 460, y: 180 },
        data: {
          type: 'llm',
          label: 'Run LLM',
          model: 'gemini-2.5-flash',
          systemPrompt: '',
          userMessage: '',
          result: null,
          resultIsImage: false,
          isRunning: false,
          error: null,
        } satisfies LLMNodeData,
      },
    ],
    edges: [
      {
        id: 'st-e1',
        source: 'st-sys',
        target: 'st-llm',
        sourceHandle: 'output',
        targetHandle: 'system_prompt',
        style: { stroke: '#6366f1', strokeWidth: 2 },
        type: 'animated',
      },
      {
        id: 'st-e2',
        source: 'st-user',
        target: 'st-llm',
        sourceHandle: 'output',
        targetHandle: 'user_message',
        style: { stroke: '#6366f1', strokeWidth: 2 },
        type: 'animated',
      },
    ],
  },

  /* ── Crop: upload-image → crop ───────────────────────────── */
  crop: {
    name: 'Crop Image',
    nodes: [
      {
        id: 'st-upload',
        type: 'upload-image',
        position: { x: 100, y: 200 },
        data: {
          type: 'upload-image',
          label: 'Image',
          imageUrl: null,
          fileName: null,
          isRunning: false,
        } satisfies UploadImageNodeData,
      },
      {
        id: 'st-crop',
        type: 'crop-image',
        position: { x: 440, y: 200 },
        data: {
          type: 'crop-image',
          label: 'Crop',
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
    ],
    edges: [
      {
        id: 'st-e1',
        source: 'st-upload',
        target: 'st-crop',
        sourceHandle: 'output',
        targetHandle: 'image_url',
        style: { stroke: '#f59e0b', strokeWidth: 2 },
        type: 'animated',
      },
    ],
  },

  /* ── Extract Frame: upload-video → extract-frame ─────────── */
  'extract-frame': {
    name: 'Extract Video Frame',
    nodes: [
      {
        id: 'st-upload-v',
        type: 'upload-video',
        position: { x: 100, y: 200 },
        data: {
          type: 'upload-video',
          label: 'Video',
          videoUrl: null,
          fileName: null,
          isRunning: false,
        } satisfies UploadVideoNodeData,
      },
      {
        id: 'st-extract',
        type: 'extract-frame',
        position: { x: 440, y: 200 },
        data: {
          type: 'extract-frame',
          label: 'Extract Frame',
          videoUrl: null,
          timestamp: '50%',
          resultUrl: null,
          isRunning: false,
          error: null,
          connectedInputs: { video_url: true },
        } satisfies ExtractFrameNodeData,
      },
    ],
    edges: [
      {
        id: 'st-e1',
        source: 'st-upload-v',
        target: 'st-extract',
        sourceHandle: 'output',
        targetHandle: 'video_url',
        style: { stroke: '#ef4444', strokeWidth: 2 },
        type: 'animated',
      },
    ],
  },
}

/** Simple 2-node image analysis workflow */
export const IMAGE_ANALYZER_WORKFLOW: { name: string; nodes: FlowNode[]; edges: FlowEdge[] } = {
  name: 'Image Analyzer',
  nodes: [
    {
      id: 'ia-upload',
      type: 'upload-image',
      position: { x: 80, y: 160 },
      data: {
        type: 'upload-image',
        label: 'Input Image',
        imageUrl: null,
        fileName: null,
        isRunning: false,
      } satisfies UploadImageNodeData,
    },
    {
      id: 'ia-prompt',
      type: 'text',
      position: { x: 80, y: 340 },
      data: {
        type: 'text',
        label: 'Analysis Persona',
        content: 'You are an expert image analyst. Describe what you see in detail, including objects, colors, mood, and any notable composition elements.',
        isRunning: false,
      } satisfies TextNodeData,
    },
    {
      id: 'ia-llm',
      type: 'llm',
      position: { x: 420, y: 220 },
      data: {
        type: 'llm',
        label: 'Analyze Image',
        model: 'gemini-2.5-flash',
        systemPrompt: '',
        userMessage: 'Please analyze this image.',
        result: null,
        resultIsImage: false,
        isRunning: false,
        error: null,
      } satisfies LLMNodeData,
    },
  ],
  edges: [
    {
      id: 'ia-e1',
      source: 'ia-upload',
      target: 'ia-llm',
      sourceHandle: 'output',
      targetHandle: 'images',
      style: { stroke: '#f59e0b', strokeWidth: 2 },
      type: 'animated',
    },
    {
      id: 'ia-e2',
      source: 'ia-prompt',
      target: 'ia-llm',
      sourceHandle: 'output',
      targetHandle: 'system_prompt',
      style: { stroke: '#6366f1', strokeWidth: 2 },
      type: 'animated',
    },
  ],
}

/** 3-node video frame extraction + analysis workflow */
export const VIDEO_FRAME_WORKFLOW: { name: string; nodes: FlowNode[]; edges: FlowEdge[] } = {
  name: 'Video Frame Extractor',
  nodes: [
    {
      id: 'vf-upload',
      type: 'upload-video',
      position: { x: 80, y: 160 },
      data: {
        type: 'upload-video',
        label: 'Input Video',
        videoUrl: null,
        fileName: null,
        isRunning: false,
      } satisfies UploadVideoNodeData,
    },
    {
      id: 'vf-extract',
      type: 'extract-frame',
      position: { x: 380, y: 160 },
      data: {
        type: 'extract-frame',
        label: 'Extract Key Frame',
        videoUrl: null,
        timestamp: '25%',
        resultUrl: null,
        isRunning: false,
        error: null,
        connectedInputs: { video_url: true },
      } satisfies ExtractFrameNodeData,
    },
    {
      id: 'vf-prompt',
      type: 'text',
      position: { x: 80, y: 360 },
      data: {
        type: 'text',
        label: 'Scene Description Prompt',
        content: 'You are a video production expert. Describe the scene in this video frame, including action, setting, and cinematography.',
        isRunning: false,
      } satisfies TextNodeData,
    },
    {
      id: 'vf-llm',
      type: 'llm',
      position: { x: 680, y: 240 },
      data: {
        type: 'llm',
        label: 'Describe Scene',
        model: 'gemini-2.5-flash',
        systemPrompt: '',
        userMessage: 'Describe this video frame.',
        result: null,
        resultIsImage: false,
        isRunning: false,
        error: null,
      } satisfies LLMNodeData,
    },
  ],
  edges: [
    {
      id: 'vf-e1',
      source: 'vf-upload',
      target: 'vf-extract',
      sourceHandle: 'output',
      targetHandle: 'video_url',
      style: { stroke: '#ef4444', strokeWidth: 2 },
      type: 'animated',
    },
    {
      id: 'vf-e2',
      source: 'vf-extract',
      target: 'vf-llm',
      sourceHandle: 'output',
      targetHandle: 'images',
      style: { stroke: '#06b6d4', strokeWidth: 2 },
      type: 'animated',
    },
    {
      id: 'vf-e3',
      source: 'vf-prompt',
      target: 'vf-llm',
      sourceHandle: 'output',
      targetHandle: 'system_prompt',
      style: { stroke: '#6366f1', strokeWidth: 2 },
      type: 'animated',
    },
  ],
}

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
        resultIsImage: false,
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
        resultIsImage: false,
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
