'use client'

import { memo, useCallback, useState, useRef } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Image, Upload, X, Loader2 } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { UploadImageNodeData } from '@/types/nodes'
import { cn } from '@/lib/utils'

const HANDLE_STYLE = {
  width: 14,
  height: 14,
  border: '2px solid #1e293b',
  background: '#f59e0b',
}

async function uploadWithTransloadit(
  file: File,
  type: 'image',
): Promise<string> {
  const Uppy = (await import('@uppy/core')).default
  const Transloadit = (await import('@uppy/transloadit')).default

  // Fetch signed assembly params from backend
  const sigRes = await fetch(`/api/upload/signature?type=${type}`, {
    method: 'POST',
  })
  if (!sigRes.ok) throw new Error('Failed to get upload signature')
  const { params, signature } = (await sigRes.json()) as {
    params: string
    signature: string
  }

  return new Promise<string>((resolve, reject) => {
    const uppy = new Uppy({ restrictions: { maxNumberOfFiles: 1 } })

    uppy.use(Transloadit, {
      assemblyOptions: {
        params: JSON.parse(params) as Record<string, unknown>,
        signature,
      },
      waitForEncoding: true,
    })

    uppy.on('transloadit:complete', (assembly) => {
      const results = Object.values(assembly.results ?? {}).flat()
      const first = results[0] as { ssl_url?: string; url?: string } | undefined
      const url = first?.ssl_url ?? first?.url
      if (url) resolve(url)
      else reject(new Error('No upload URL returned'))
    })

    uppy.on('error', (err) => reject(err as Error))

    void uppy.addFile({ name: file.name, type: file.type, data: file })
    uppy.upload().catch(() => {/* errors routed through uppy.on('error') */})
  })
}

// 4 MB cap for inline base64 — anything larger should rely on a real CDN.
const MAX_INLINE_BYTES = 4 * 1024 * 1024

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export const UploadImageNode = memo(function UploadImageNode({
  id,
  data,
  selected,
}: NodeProps) {
  const nodeData = data as UploadImageNodeData
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return

      setIsUploading(true)
      setUploadError(null)

      // Show a preview immediately with an object URL
      const previewUrl = URL.createObjectURL(file)
      updateNodeData<UploadImageNodeData>(id, {
        imageUrl: previewUrl,
        fileName: file.name,
      })

      const transloaditKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY
      let cdnSucceeded = false
      if (transloaditKey) {
        try {
          const cdnUrl = await uploadWithTransloadit(file, 'image')
          URL.revokeObjectURL(previewUrl)
          updateNodeData<UploadImageNodeData>(id, { imageUrl: cdnUrl })
          cdnSucceeded = true
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed'
          setUploadError(msg)
        }
      }

      // Fallback: if no CDN upload happened, embed the file as a base64 data URL
      // so the server-side LLM call can actually fetch it. blob: URLs only work
      // in the browser tab and would be silently dropped.
      if (!cdnSucceeded) {
        if (file.size > MAX_INLINE_BYTES) {
          setUploadError(
            `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB — too large to embed without a CDN. Configure Transloadit or use an image under 4 MB.`,
          )
        } else {
          try {
            const dataUrl = await fileToDataUrl(file)
            URL.revokeObjectURL(previewUrl)
            updateNodeData<UploadImageNodeData>(id, { imageUrl: dataUrl })
            setUploadError(null) // base64 fallback succeeded — image is usable
          } catch {
            setUploadError('Failed to read image file.')
          }
        }
      }

      setIsUploading(false)
    },
    [id, updateNodeData],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) void handleFileSelect(file)
    },
    [handleFileSelect],
  )

  const handleClear = useCallback(() => {
    updateNodeData<UploadImageNodeData>(id, {
      imageUrl: null,
      fileName: null,
    })
    setUploadError(null)
  }, [id, updateNodeData])

  return (
    <BaseNode
      id={id}
      isRunning={nodeData.isRunning}
      isSelected={selected}
      title={nodeData.label}
      icon={<Image size={12} />}
      headerColor="#f59e0b"
    >
      {nodeData.imageUrl ? (
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={nodeData.imageUrl}
            alt={nodeData.fileName ?? 'Uploaded image'}
            className="w-full h-32 object-cover rounded-lg border border-border"
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-canvas/60">
              <Loader2 size={16} className="text-warning animate-spin" />
            </div>
          )}
          <button
            onClick={handleClear}
            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-canvas/80 text-textmuted
              hover:text-error hover:bg-canvas transition-all opacity-0 group-hover:opacity-100"
          >
            <X size={12} />
          </button>
          <p className="mt-1 text-[10px] text-textsub truncate">
            {isUploading ? 'Uploading to CDN…' : nodeData.fileName}
          </p>
          {uploadError && (
            <p className="text-[10px] text-warning truncate" title={uploadError}>
              ⚠ {uploadError}
            </p>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed',
            'transition-all duration-150 cursor-pointer nodrag',
            isDragOver
              ? 'border-warning bg-warning/5'
              : 'border-border hover:border-borderhov',
          )}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} className="text-textmuted" />
          <p className="text-[10px] text-textsub">
            Drop image or click to upload
          </p>
          <p className="text-[9px] text-textsub">JPEG, PNG, WebP, GIF</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFileSelect(file)
            }}
          />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        title="Image Output"
        style={HANDLE_STYLE}
      />
    </BaseNode>
  )
})
