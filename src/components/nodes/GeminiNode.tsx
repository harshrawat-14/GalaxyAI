"use client";

import type { NodeProps } from "@xyflow/react";
import { Info } from "lucide-react";
import {
  NumberParam,
  OutputBox,
  SettingsSection,
  SliderParam,
  TextAreaParam,
  ToggleParam,
} from "@/components/canvas/controls";
import { estimateNodeTokens, formatM } from "@/lib/estimates";
import { GEMINI_MODELS } from "@/lib/constants";
import { getNodeSpec, type GeminiConfig } from "@/domain/nodes";
import { useWorkflowStore, type NextFlowNode } from "@/store/workflow-store";
import { NodeShell, PortRow } from "./NodeShell";

const MEDIA_PORT_IDS = new Set(["image", "video", "audio", "file"]);

export function GeminiNode({ id, data, selected }: NodeProps<NextFlowNode>) {
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const edges = useWorkflowStore((s) => s.edges);
  const addRequestInputsFieldAndConnect = useWorkflowStore((s) => s.addRequestInputsFieldAndConnect);
  const config = data.config as GeminiConfig;
  const spec = getNodeSpec("gemini");
  const inputs = spec.inputs(config);
  const promptPort = inputs.find((p) => p.id === "prompt");
  const systemPromptPort = inputs.find((p) => p.id === "system_prompt");
  const mediaPorts = inputs.filter((p) => MEDIA_PORT_IDS.has(p.id));

  const isConnected = (handle: string) => edges.some((e) => e.target === id && e.targetHandle === handle);
  const addAndConnect = (handle: string, fieldType: "number_field" | "boolean_field" | "text_field") =>
    addRequestInputsFieldAndConnect(id, handle, fieldType);

  // Realtime output is keyed by output port id (e.g. "response"), not a fixed "text" field.
  const outputPort = spec.outputs(config)[0];
  const output = data.output as Record<string, unknown> | undefined;
  const outputText = outputPort ? (output?.[outputPort.id] as string | undefined) : undefined;

  return (
    <NodeShell
      id={id}
      kind="gemini"
      label={config.model}
      status={data.status}
      selected={selected}
      executable={spec.executable}
      deletable={spec.deletable}
      description={spec.description}
      locked={data.locked}
      width="w-[340px]"
    >
      <label className="block text-xs text-label-muted">
        Model
        <select
          value={config.model}
          onChange={(e) => updateNodeConfig(id, { model: e.target.value })}
          className="mt-0.5 w-full rounded bg-canvas-bg px-2 py-1 text-xs text-text-strong"
        >
          {GEMINI_MODELS.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </label>

      {promptPort && (
        <TextAreaParam
          label="Prompt"
          required
          portId="prompt"
          connected={isConnected("prompt")}
          value={config.prompt}
          onChange={(value) => updateNodeConfig(id, { prompt: value })}
          placeholder="Enter your prompt…"
        />
      )}

      {systemPromptPort && (
        <TextAreaParam
          label="System Prompt"
          portId="system_prompt"
          connected={isConnected("system_prompt")}
          value={config.systemPrompt}
          onChange={(value) => updateNodeConfig(id, { systemPrompt: value })}
          placeholder="You are a helpful assistant…"
        />
      )}

      {mediaPorts.map((port) => (
        <PortRow key={port.id} port={port} direction="input" />
      ))}

      <SettingsSection
        open={config.settingsOpen}
        onToggle={() => updateNodeConfig(id, { settingsOpen: !config.settingsOpen })}
      >
        <SliderParam
          label="Temperature"
          portId="temperature"
          connected={isConnected("temperature")}
          value={config.temperature}
          min={0}
          max={2}
          step={0.1}
          onChange={(value) => updateNodeConfig(id, { temperature: value })}
          onReset={() => updateNodeConfig(id, { temperature: 1 })}
          onAdd={() => addAndConnect("temperature", "number_field")}
        />
        <NumberParam
          label="Max Output Tokens"
          portId="max_output_tokens"
          connected={isConnected("max_output_tokens")}
          value={config.maxOutputTokens}
          onChange={(value) => updateNodeConfig(id, { maxOutputTokens: value ?? 2048 })}
          onAdd={() => addAndConnect("max_output_tokens", "number_field")}
        />
        <SliderParam
          label="Top P"
          portId="top_p"
          connected={isConnected("top_p")}
          value={config.topP}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => updateNodeConfig(id, { topP: value })}
          onReset={() => updateNodeConfig(id, { topP: 0.95 })}
          onAdd={() => addAndConnect("top_p", "number_field")}
        />
        <SliderParam
          label="Top K"
          portId="top_k"
          connected={isConnected("top_k")}
          value={config.topK}
          min={1}
          max={100}
          step={1}
          onChange={(value) => updateNodeConfig(id, { topK: value })}
          onReset={() => updateNodeConfig(id, { topK: 40 })}
          onAdd={() => addAndConnect("top_k", "number_field")}
        />
        <TextAreaParam
          label="Stop Sequences"
          portId="stop_sequences"
          connected={isConnected("stop_sequences")}
          value={config.stopSequences}
          onChange={(value) => updateNodeConfig(id, { stopSequences: value })}
          placeholder="e.g. END, STOP, ###"
          onAdd={() => addAndConnect("stop_sequences", "text_field")}
        />
        <NumberParam
          label="Seed"
          portId="seed"
          connected={isConnected("seed")}
          value={config.seed ?? ""}
          onChange={(value) => updateNodeConfig(id, { seed: value })}
          onAdd={() => addAndConnect("seed", "number_field")}
        />
        <ToggleParam
          label="JSON Mode"
          portId="json_mode"
          connected={isConnected("json_mode")}
          value={config.jsonMode}
          onChange={(value) => updateNodeConfig(id, { jsonMode: value })}
          onAdd={() => addAndConnect("json_mode", "boolean_field")}
        />
        <ToggleParam
          label="Reasoning"
          portId="reasoning"
          connected={isConnected("reasoning")}
          value={config.reasoning}
          onChange={(value) => updateNodeConfig(id, { reasoning: value })}
          onAdd={() => addAndConnect("reasoning", "boolean_field")}
        />
      </SettingsSection>

      <div className="space-y-1">
        <span className="text-[13px] text-text-strong">Response</span>
        <OutputBox testId="gemini-response">{outputText}</OutputBox>
        {spec.outputs(config).map((port) => (
          <PortRow key={port.id} port={port} direction="output" />
        ))}
      </div>

      <div className="flex items-center justify-end gap-1 pt-1 text-[11px] text-label-muted">
        {formatM(estimateNodeTokens({ kind: "gemini", config }))}
        <Info size={10} />
      </div>
    </NodeShell>
  );
}
