import { describe, expect, it } from "vitest";
import {
  ancestorsOf,
  directChildren,
  directParents,
  incomingEdges,
  topologicalOrder,
  validateConnection,
  validateGraph,
  wouldCreateCycle,
} from "./dag";
import { getNodeSpec } from "./nodes";
import type { GraphEdge, GraphNode, WorkflowGraph } from "./types";

function node(id: string, kind: GraphNode["kind"], config?: unknown): GraphNode {
  return { id, kind, position: { x: 0, y: 0 }, config: config ?? getNodeSpec(kind).defaultConfig() };
}

function edge(id: string, source: string, sourceHandle: string, target: string, targetHandle: string): GraphEdge {
  return { id, source, sourceHandle, target, targetHandle };
}

/** Request-Inputs → Crop Image → Gemini → Response, plus a second Gemini fed by the first. */
function sampleGraph(): WorkflowGraph {
  const inputs = node("inputs", "request-inputs", {
    fields: [
      { id: "image_field", name: "image_field", type: "image_field", value: null },
      { id: "text_field", name: "text_field", type: "text_field", value: "hello" },
    ],
  });
  const crop = node("crop1", "crop-image");
  const gemini1 = node("gemini1", "gemini");
  const gemini2 = node("gemini2", "gemini");
  const response = node("response", "response");

  return {
    nodes: [inputs, crop, gemini1, gemini2, response],
    edges: [
      edge("e1", "inputs", "image_field", "crop1", "input_image"),
      edge("e2", "inputs", "text_field", "gemini1", "prompt"),
      edge("e3", "gemini1", "response", "gemini2", "prompt"),
      edge("e4", "gemini2", "response", "response", "result"),
    ],
    stickyNotes: [],
  };
}

describe("directParents / directChildren", () => {
  it("returns adjacency in each direction", () => {
    const g = sampleGraph();
    expect(directParents(g, "gemini2")).toEqual(["gemini1"]);
    expect(directChildren(g, "gemini1")).toEqual(["gemini2"]);
    expect(directParents(g, "inputs")).toEqual([]);
    expect(directChildren(g, "response")).toEqual([]);
  });

  it("deduplicates parallel edges to the same neighbor", () => {
    const g = sampleGraph();
    g.edges.push(edge("e5", "inputs", "text_field", "gemini1", "system_prompt"));
    expect(directParents(g, "gemini1")).toEqual(["inputs"]);
  });
});

describe("incomingEdges", () => {
  it("filters by target node and handle", () => {
    const g = sampleGraph();
    expect(incomingEdges(g, "crop1", "input_image")).toHaveLength(1);
    expect(incomingEdges(g, "gemini1", "system_prompt")).toHaveLength(0);
  });

  it("supports multiple incoming edges on one handle (vision fan-in)", () => {
    const g = sampleGraph();
    g.edges.push(edge("e6", "crop1", "output_image", "gemini2", "image"));
    g.edges.push(edge("e7", "inputs", "image_field", "gemini2", "image"));
    expect(incomingEdges(g, "gemini2", "image")).toHaveLength(2);
  });
});

describe("wouldCreateCycle", () => {
  it("flags a self-loop", () => {
    const g = sampleGraph();
    expect(wouldCreateCycle(g, "gemini1", "gemini1")).toBe(true);
  });

  it("flags an edge that would close a loop back to an ancestor", () => {
    const g = sampleGraph();
    expect(wouldCreateCycle(g, "gemini2", "gemini1")).toBe(true);
  });

  it("allows a new edge that does not close a loop", () => {
    const g = sampleGraph();
    expect(wouldCreateCycle(g, "inputs", "gemini2")).toBe(false);
  });
});

describe("validateConnection", () => {
  it("rejects self-loops", () => {
    const g = sampleGraph();
    const res = validateConnection(g, {
      source: "gemini1",
      sourceHandle: "response",
      target: "gemini1",
      targetHandle: "prompt",
    });
    expect(res).toEqual({ ok: false, reason: "Cannot connect a node to itself" });
  });

  it("rejects unknown handles", () => {
    const g = sampleGraph();
    const res = validateConnection(g, {
      source: "gemini1",
      sourceHandle: "response",
      target: "crop1",
      targetHandle: "does_not_exist",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects incompatible port types", () => {
    const g = sampleGraph();
    // gemini1.response is "text"; crop1.input_image expects "image"
    const res = validateConnection(g, {
      source: "gemini1",
      sourceHandle: "response",
      target: "crop1",
      targetHandle: "input_image",
    });
    expect(res).toEqual({ ok: false, reason: "Cannot connect text → image" });
  });

  it("rejects a second connection into a single (non-multiple) input", () => {
    const g = sampleGraph();
    const res = validateConnection(g, {
      source: "gemini1",
      sourceHandle: "response",
      target: "gemini2",
      targetHandle: "prompt",
    });
    expect(res).toEqual({ ok: false, reason: "Input already connected" });
  });

  it("allows a second connection into a multiple input", () => {
    const g = sampleGraph();
    g.edges.push(edge("e6", "crop1", "output_image", "gemini2", "image"));
    const res = validateConnection(g, {
      source: "inputs",
      sourceHandle: "image_field",
      target: "gemini2",
      targetHandle: "image",
    });
    expect(res).toEqual({ ok: true });
  });

  it("rejects connections that would create a cycle", () => {
    const g = sampleGraph();
    const res = validateConnection(g, {
      source: "gemini2",
      sourceHandle: "response",
      target: "gemini1",
      targetHandle: "system_prompt",
    });
    expect(res).toEqual({ ok: false, reason: "Connection would create a cycle" });
  });

  it("accepts a legal, type-compatible, acyclic connection", () => {
    const g = sampleGraph();
    const res = validateConnection(g, {
      source: "inputs",
      sourceHandle: "text_field",
      target: "gemini2",
      targetHandle: "system_prompt",
    });
    expect(res).toEqual({ ok: true });
  });
});

/** A -> B, A -> C, B -> D, C -> D — the canonical diamond join shape. */
function diamondGraph(): WorkflowGraph {
  return {
    nodes: [
      node("A", "request-inputs"),
      node("B", "crop-image"),
      node("C", "crop-image"),
      node("D", "response"),
    ],
    edges: [
      edge("ab", "A", "text_field", "B", "input_image"),
      edge("ac", "A", "text_field", "C", "input_image"),
      edge("bd", "B", "output_image", "D", "result"),
      edge("cd", "C", "output_image", "D", "result"),
    ],
    stickyNotes: [],
  };
}

describe("topologicalOrder", () => {
  it("orders a chain so every node precedes its children", () => {
    const g = sampleGraph();
    const order = topologicalOrder(g);
    const pos = (id: string) => order.indexOf(id);
    expect(pos("inputs")).toBeLessThan(pos("crop1"));
    expect(pos("inputs")).toBeLessThan(pos("gemini1"));
    expect(pos("gemini1")).toBeLessThan(pos("gemini2"));
    expect(pos("gemini2")).toBeLessThan(pos("response"));
  });

  it("orders a diamond so the join node comes last", () => {
    const g = diamondGraph();
    const order = topologicalOrder(g);
    const pos = (id: string) => order.indexOf(id);
    expect(pos("A")).toBeLessThan(pos("B"));
    expect(pos("A")).toBeLessThan(pos("C"));
    expect(pos("B")).toBeLessThan(pos("D"));
    expect(pos("C")).toBeLessThan(pos("D"));
  });

  it("orders a graph with a disconnected component", () => {
    const g = diamondGraph();
    g.nodes.push(node("isolated", "response"));
    const order = topologicalOrder(g);
    expect(order).toHaveLength(5);
    expect(order).toContain("isolated");
  });

  it("restricts to an induced subgraph when nodeIds is given", () => {
    const g = sampleGraph();
    const order = topologicalOrder(g, ["inputs", "gemini1"]);
    expect(order.sort()).toEqual(["gemini1", "inputs"]);
  });

  it("throws on a cycle", () => {
    const g = sampleGraph();
    g.edges.push(edge("cyclic", "gemini2", "response", "gemini1", "system_prompt"));
    expect(() => topologicalOrder(g)).toThrow(/cycle/i);
  });
});

describe("ancestorsOf", () => {
  it("returns the upstream closure including the targets themselves", () => {
    const g = sampleGraph();
    const ancestors = ancestorsOf(g, ["gemini2"]);
    expect(ancestors).toEqual(new Set(["gemini2", "gemini1", "inputs"]));
  });

  it("merges closures across multiple targets", () => {
    const g = sampleGraph();
    const ancestors = ancestorsOf(g, ["crop1", "gemini1"]);
    expect(ancestors).toEqual(new Set(["crop1", "gemini1", "inputs"]));
  });

  it("diamond closure: the join node's ancestors include both branches and the root, with no duplicates", () => {
    const g = diamondGraph();
    const ancestors = ancestorsOf(g, ["D"]);
    expect(ancestors).toEqual(new Set(["D", "B", "C", "A"]));
    expect(ancestors.size).toBe(4); // explicit no-dupes check
  });
});

describe("validateGraph", () => {
  it("accepts a well-formed graph", () => {
    expect(validateGraph(sampleGraph())).toEqual({ ok: true });
  });

  it("rejects an edge referencing an unknown node", () => {
    const g = sampleGraph();
    g.edges.push(edge("bad", "ghost", "out", "gemini1", "prompt"));
    expect(validateGraph(g).ok).toBe(false);
  });

  it("rejects an edge referencing an unknown handle", () => {
    const g = sampleGraph();
    g.edges.push(edge("bad", "inputs", "does_not_exist", "gemini1", "system_prompt"));
    expect(validateGraph(g).ok).toBe(false);
  });

  it("rejects a type-incompatible edge", () => {
    const g = sampleGraph();
    g.edges.push(edge("bad", "gemini1", "response", "crop1", "input_image"));
    expect(validateGraph(g)).toEqual({
      ok: false,
      reason: 'Edge "bad": cannot connect text → image',
    });
  });

  it("rejects more than one connection into a single (non-multiple) input", () => {
    const g = sampleGraph();
    g.edges.push(edge("dup", "inputs", "text_field", "gemini2", "prompt"));
    expect(validateGraph(g).ok).toBe(false);
  });

  it("allows multiple connections into a multiple:true input", () => {
    const g = sampleGraph();
    g.edges.push(edge("e6", "crop1", "output_image", "gemini2", "image"));
    g.edges.push(edge("e7", "inputs", "image_field", "gemini2", "image"));
    expect(validateGraph(g)).toEqual({ ok: true });
  });

  it("rejects a graph containing a cycle", () => {
    const g = sampleGraph();
    g.edges.push(edge("cyclic", "gemini2", "response", "gemini1", "system_prompt"));
    expect(validateGraph(g)).toEqual({ ok: false, reason: "Graph contains a cycle" });
  });
});
