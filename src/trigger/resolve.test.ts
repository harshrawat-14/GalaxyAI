import { describe, expect, it } from "vitest";
import { DEFAULT_GEMINI_MODEL, getNodeSpec } from "@/domain/nodes";
import type { GraphEdge, GraphNode, WorkflowGraph } from "@/domain/types";
import { MissingUpstreamInputError, resolveInputs } from "./resolve";

function node(id: string, kind: GraphNode["kind"], config?: unknown): GraphNode {
  return { id, kind, position: { x: 0, y: 0 }, config: config ?? getNodeSpec(kind).defaultConfig() };
}

function edge(id: string, source: string, sourceHandle: string, target: string, targetHandle: string): GraphEdge {
  return { id, source, sourceHandle, target, targetHandle };
}

describe("resolveInputs", () => {
  it("pulls a single connected input from its parent's result", async () => {
    const inputs = node("inputs", "request-inputs", {
      fields: [{ id: "text_field", name: "text_field", type: "text_field", value: "ignored" }],
    });
    const gemini = node("gemini1", "gemini", {
      model: DEFAULT_GEMINI_MODEL,
      prompt: "",
      systemPrompt: "manual sys",
      temperature: 1,
      maxOutputTokens: 2048,
    });
    const graph: WorkflowGraph = {
      nodes: [inputs, gemini],
      edges: [edge("e1", "inputs", "text_field", "gemini1", "prompt")],
      stickyNotes: [],
    };

    const result = await resolveInputs(gemini, graph, async (id, handle) => {
      expect([id, handle]).toEqual(["inputs", "text_field"]);
      return "resolved upstream text";
    });

    expect(result.prompt).toBe("resolved upstream text");
    expect(result.system_prompt).toBe("manual sys"); // unconnected -> manual config fallback
  });

  it("a connection wins over a manual config value when a port has both", async () => {
    const inputs = node("inputs", "request-inputs", {
      fields: [{ id: "text_field", name: "text_field", type: "text_field", value: "ignored" }],
    });
    const gemini = node("gemini1", "gemini", {
      model: DEFAULT_GEMINI_MODEL,
      prompt: "this manual value must be ignored because prompt is connected",
      systemPrompt: "",
      temperature: 1,
      maxOutputTokens: 2048,
    });
    const graph: WorkflowGraph = {
      nodes: [inputs, gemini],
      edges: [edge("e1", "inputs", "text_field", "gemini1", "prompt")],
      stickyNotes: [],
    };

    const result = await resolveInputs(gemini, graph, async () => "value from the connected edge");

    expect(result.prompt).toBe("value from the connected edge");
  });

  it("collects multiple incoming edges into an array for multiple:true ports", async () => {
    const crop1 = node("crop1", "crop-image");
    const crop2 = node("crop2", "crop-image");
    const gemini = node("gemini1", "gemini", {
      model: DEFAULT_GEMINI_MODEL,
      prompt: "describe",
      systemPrompt: "",
      temperature: 1,
      maxOutputTokens: 2048,
    });
    const graph: WorkflowGraph = {
      nodes: [crop1, crop2, gemini],
      edges: [
        edge("e1", "crop1", "output_image", "gemini1", "image"),
        edge("e2", "crop2", "output_image", "gemini1", "image"),
      ],
      stickyNotes: [],
    };

    const results: Record<string, string> = { crop1: "url-1", crop2: "url-2" };
    const result = await resolveInputs(gemini, graph, async (id) => results[id]);

    expect(result.image).toEqual(["url-1", "url-2"]);
  });

  it("throws MissingUpstreamInputError when a required port has neither a connection nor a manual value", async () => {
    const crop = node("crop1", "crop-image");
    const graph: WorkflowGraph = { nodes: [crop], edges: [], stickyNotes: [] };

    await expect(resolveInputs(crop, graph, async () => "unused")).rejects.toThrow(
      MissingUpstreamInputError,
    );
  });

  it("defaults an unconnected, non-required, no-manual-value port to null (or [] when multiple)", async () => {
    const gemini = node("gemini1", "gemini", {
      model: DEFAULT_GEMINI_MODEL,
      prompt: "manual prompt",
      systemPrompt: "",
      temperature: 1,
      maxOutputTokens: 2048,
    });
    const graph: WorkflowGraph = { nodes: [gemini], edges: [], stickyNotes: [] };

    const result = await resolveInputs(gemini, graph, async () => "unused");

    expect(result.prompt).toBe("manual prompt");
    expect(result.system_prompt).toBeNull(); // empty string manual value -> falls back to null
    expect(result.image).toEqual([]);
    expect(result.video).toBeNull();
  });
});
