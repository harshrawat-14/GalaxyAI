'use client'

import { memo, useCallback, useState, useRef } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Video, Upload, X, Loader2 } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { UploadVideoNodeData } from '@/types/nodes'
import { cn } from '@/lib/utils'

const HANDLE_STYLE = {
  width: 14,
  height: 14,
  border: '2px solid #1e293b',
  background: '#06b6d4',
}

async function uploadVideoToServer(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/upload/local', { method: 'POST', body: formData })
  if (!res.ok) throw new Error('Server upload failed')
  const { url } = (await res.json()) as { url: string }
  return url
}

export const UploadVideoNode = memo(function UploadVideoNode({
  id,
  data,
  selected,
}: NodeProps) {
  const nodeData = data as UploadVideoNodeData
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('video/')) return

      setIsUploading(true)
      setUploadError(null)

      // Show preview immediately
      const previewUrl = URL.createObjectURL(file)
      updateNodeData<UploadVideoNodeData>(id, {
        videoUrl: previewUrl,
        fileName: file.name,
      })

      try {
        const serverUrl = await uploadVideoToServer(file)
        URL.revokeObjectURL(previewUrl)
        updateNodeData<UploadVideoNodeData>(id, { videoUrl: serverUrl })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        setUploadError(`${msg} — local preview only, frame extraction won't work`)
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
    updateNodeData<UploadVideoNodeData>(id, { videoUrl: null, fileName: null })
    setUploadError(null)
  }, [id, updateNodeData])

  return (
    <BaseNode
      id={id}
      isRunning={nodeData.isRunning}
      isSelected={selected}
      title={nodeData.label}
      icon={<Video size={12} />}
      headerColor="#ef4444"
    >
      {nodeData.videoUrl ? (
        <div className="relative group">
          <video
            src={nodeData.videoUrl}
            className="w-full h-32 object-cover rounded-lg border border-border"
            controls={false}
            muted
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-canvas/60">
              <Loader2 size={16} className="text-error animate-spin" />
            </div>
          )}
          <button
            onClick={handleClear}
            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-canvas/80 text-textmuted
              hover:text-error hover:bg-canvas transition-all opacity-0 group-hover:opacity-100"
          >
            <X size={12} />
          </button>
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-canvas/80">
            <Video size={10} className="text-error inline mr-1" />
            <span className="text-[9px] text-textsub">
              {isUploading ? 'Uploading to CDN…' : nodeData.fileName}
            </span>
          </div>
          {uploadError && (
            <p className="mt-1 text-[10px] text-error truncate" title={uploadError}>
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
              ? 'border-error bg-error/5'
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
            Drop video or click to upload
          </p>
          <p className="text-[9px] text-textsub">MP4, MOV, WebM</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
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
        title="Video Output"
        style={HANDLE_STYLE}
      />
    </BaseNode>
  )
})
