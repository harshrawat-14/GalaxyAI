"use client";

import type { NodeProps } from "@xyflow/react";
import { OutputBox } from "@/components/canvas/controls";
import { getNodeSpec, nodeDisplayLabel, type ResponseConfig } from "@/domain/nodes";
import { resultValue } from "@/lib/resultValue";
import { isStickyNoteNode, useWorkflowStore, type NextFlowNode } from "@/store/workflow-store";
import { NodeInfoButton, NodeShell, PortRow } from "./NodeShell";

export function ResponseNode({ id, data, selected }: NodeProps<NextFlowNode>) {
  const config = data.config as ResponseConfig;
  const spec = getNodeSpec("response");
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const output = data.output as { result?: unknown[] } | undefined;

  // One entry per connected source node, in connection order — matches the
  // run engine's `multiple: true` resolution order for the "result" port.
  const sources = edges
    .filter((e) => e.target === id && e.targetHandle === "result")
    .map((edge, i) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const label =
        sourceNode && !isStickyNoteNode(sourceNode)
          ? nodeDisplayLabel(sourceNode.data.kind, sourceNode.data.config)
          : "Output";
      return { key: edge.id, label, value: output?.result?.[i] };
    });

  return (
    <NodeShell
      id={id}
      kind="response"
      label="Response"
      status={data.status}
      selected={selected}
      executable={spec.executable}
      deletable={spec.deletable}
      description={spec.description}
      locked={data.locked}
      headerLeftExtra={<NodeInfoButton description={spec.description} />}
      headerRight={<></>}
    >
      {spec.inputs(config).map((port) => (
        <PortRow key={port.id} port={port} direction="input" />
      ))}
      {sources.length > 0 ? (
        sources.map((source) => (
          <div key={source.key} className="space-y-1">
            <span className="text-[13px] text-text-strong">{source.label}</span>
            <OutputBox testId="response-result-box">{resultValue(source.value)}</OutputBox>
          </div>
        ))
      ) : (
        <OutputBox testId="response-result-box" />
      )}
    </NodeShell>
  );
}
