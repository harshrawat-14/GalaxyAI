'use client'

import {
  getSmoothStepPath,
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react'

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  const strokeColor =
    (style?.stroke as string | undefined) ?? '#8b5cf6'

  return (
    <>
      {/* Glow layer behind the main edge */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: 6,
          strokeOpacity: 0.15,
          fill: 'none',
        }}
      />

      {/* Main edge with dashed animation */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: '6 3',
          animation: 'dash 1.2s linear infinite',
          fill: 'none',
          filter: selected
            ? `drop-shadow(0 0 4px ${strokeColor})`
            : undefined,
        }}
      />

      <EdgeLabelRenderer>
        <style>{`
          @keyframes dash {
            to { stroke-dashoffset: -18; }
          }
        `}</style>
      </EdgeLabelRenderer>
    </>
  )
}
