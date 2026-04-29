'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Brain, ChevronDown } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { LLMNodeData, LLMModel, GroqModel, GeminiModel, HuggingFaceModel } from '@/types/nodes'
import { cn } from '@/lib/utils'

const IS_DEV = process.env.NEXT_PUBLIC_DEVELOPMENT === 'true'

const GEMINI_TEXT_MODELS: GeminiModel[] = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.5-pro',
  'gemini-2.5-pro-preview-03-25',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

const GEMINI_IMAGE_MODELS_LIST: GeminiModel[] = [
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
]

const GROQ_MODELS: GroqModel[] = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
]

const HF_IMAGE_MODELS: HuggingFaceModel[] = [
  'black-forest-labs/FLUX.1-schnell',
]

const GEMINI_IMAGE_SET = new Set<string>(GEMINI_IMAGE_MODELS_LIST)
const HF_SET = new Set<string>(HF_IMAGE_MODELS)

function isImageGenModel(model: string) {
  return GEMINI_IMAGE_SET.has(model) || HF_SET.has(model)
}

function headerColor(model: string) {
  if (HF_SET.has(model)) return '#ff6b00'
  if (GEMINI_IMAGE_SET.has(model)) return '#4285f4'
  if (model.startsWith('gemini-')) return '#4285f4'
  return '#8b5cf6'
}

const INPUT_HANDLE = {
  width: 14,
  height: 14,
  border: '2px solid #1e293b',
  background: '#64748b',
}

const OUTPUT_HANDLE = {
  width: 14,
  height: 14,
  border: '2px solid #1e293b',
  background: '#8b5cf6',
}

const DEFAULT_MODEL: LLMModel = 'gemini-2.5-flash'

export const LLMNode = memo(function LLMNode({ id, data, selected }: NodeProps) {
  const nodeData = data as LLMNodeData
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)

  const update = useCallback(
    <K extends keyof LLMNodeData>(key: K, value: LLMNodeData[K]) => {
      updateNodeData<LLMNodeData>(id, { [key]: value } as Partial<LLMNodeData>)
    },
    [id, updateNodeData],
  )

  const currentModel = nodeData.model ?? DEFAULT_MODEL
  const imgGen = isImageGenModel(currentModel)

  return (
    <BaseNode
      id={id}
      isRunning={nodeData.isRunning}
      isSelected={selected}
      title="Run LLM"
      icon={<Brain size={12} />}
      headerColor={headerColor(currentModel)}
      minWidth={210}
    >
      {/* Input: system_prompt */}
      <Handle
        type="target"
        position={Position.Left}
        id="system_prompt"
        title="System Prompt (text)"
        style={{ ...INPUT_HANDLE, top: 72 }}
      />

      {/* Input: user_message */}
      <Handle
        type="target"
        position={Position.Left}
        id="user_message"
        title="User Message (text)"
        style={{ ...INPUT_HANDLE, top: 120 }}
      />

      {/* Input: images — multi-input, accepts multiple image connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="images"
        title="Images (accepts multiple image inputs)"
        style={{ ...INPUT_HANDLE, top: 168 }}
      />

      {/* Model selector */}
      <div className="space-y-1">
        <label className="text-[10px] text-textmuted uppercase tracking-wider">
          Model
        </label>
        <div className="relative">
          <select
            value={currentModel}
            onChange={(e) => update('model', e.target.value as LLMModel)}
            disabled={nodeData.isRunning}
            className={cn(
              'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
              'text-xs text-text appearance-none cursor-pointer',
              'focus:outline-none focus:border-accent transition-colors nodrag nowheel',
              nodeData.isRunning && 'opacity-50 cursor-not-allowed',
            )}
          >
            <optgroup label="Gemini — Text">
              {GEMINI_TEXT_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </optgroup>
            <optgroup label="Gemini — Image (requires billing)">
              {GEMINI_IMAGE_MODELS_LIST.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </optgroup>
            {IS_DEV && (
              <>
                <optgroup label="Groq — Text (dev only)">
                  {GROQ_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </optgroup>
                <optgroup label="HuggingFace — Image (dev only)">
                  {HF_IMAGE_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </optgroup>
              </>
            )}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-textmuted pointer-events-none"
          />
        </div>
      </div>

      {/* System prompt — hidden for image generation models */}
      {!imgGen && (
        <div className="space-y-1">
          <label className="text-[10px] text-textmuted uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent" />
            System Prompt
            <span className="text-textsub">(optional)</span>
          </label>
          <textarea
            value={nodeData.systemPrompt}
            onChange={(e) => update('systemPrompt', e.target.value)}
            placeholder="You are a helpful assistant..."
            disabled={nodeData.isRunning}
            rows={2}
            className={cn(
              'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
              'text-xs text-text resize-none placeholder:text-textsub',
              'focus:outline-none focus:border-accent transition-colors nodrag nowheel',
            )}
          />
        </div>
      )}

      {/* User message / Image prompt */}
      <div className="space-y-1">
        <label className="text-[10px] text-textmuted uppercase tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success" />
          {imgGen ? 'Image Prompt' : 'User Message'}
        </label>
        <textarea
          value={nodeData.userMessage}
          onChange={(e) => update('userMessage', e.target.value)}
          placeholder={imgGen ? 'Describe the image to generate…' : 'Enter your message…'}
          disabled={nodeData.isRunning}
          rows={2}
          className={cn(
            'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
            'text-xs text-text resize-none placeholder:text-textsub',
            'focus:outline-none focus:border-accent transition-colors nodrag nowheel',
          )}
        />
      </div>

      {/* Result — image or text */}
      {nodeData.result && (
        <div className="mt-2 p-2 bg-surface border border-border rounded-lg space-y-1">
          <p className="text-[10px] text-textmuted uppercase tracking-wider">Output</p>
          {nodeData.resultIsImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nodeData.result}
              alt="Generated"
              className="w-full rounded-md object-contain max-h-48 nodrag nowheel"
            />
          ) : (
            <p className="text-xs text-text whitespace-pre-wrap max-h-32 overflow-y-auto nodrag nowheel">
              {nodeData.result}
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {nodeData.error && (
        <div className="mt-2 p-2 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-xs text-error">{nodeData.error}</p>
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        title="Text Output"
        style={OUTPUT_HANDLE}
      />
    </BaseNode>
  )
})
