import { beforeEach, describe, expect, it } from "vitest";
import { toWorkflowGraph, useWorkflowStore } from "./workflow-store";

function resetStore() {
  useWorkflowStore.setState({
    workflowId: null,
    nodes: [
      {
        id: "n1",
        type: "request-inputs",
        position: { x: 0, y: 0 },
        deletable: false,
        data: { kind: "request-inputs", config: { fields: [] }, status: "pending" },
      },
    ],
    edges: [],
    selection: [],
    dirty: false,
    savedAt: null,
    runId: null,
    past: [],
    future: [],
  });
}

describe("updateNodeConfig", () => {
  beforeEach(resetStore);

  it("two function-form updates fired back-to-back both apply (no lost update)", () => {
    // Regression: discovered via Playwright that two rapid clicks each
    // calling updateNodeConfig with an object literal (not a function)
    // could read a stale `config` closure and the second call would
    // clobber the first. The fix requires the update to be resolved
    // against the *current* store state inside set(), which the function
    // form (current) => ... guarantees.
    const { updateNodeConfig } = useWorkflowStore.getState();

    updateNodeConfig("n1", (current) => ({
      ...current,
      fields: [...(current.fields as unknown[]), { id: "f1" }],
    }));
    updateNodeConfig("n1", (current) => ({
      ...current,
      fields: [...(current.fields as unknown[]), { id: "f2" }],
    }));

    const node = useWorkflowStore.getState().nodes.find((n) => n.id === "n1")!;
    expect((node.data.config as { fields: unknown[] }).fields).toHaveLength(2);
  });

  it("a static object patch still merges into the current config", () => {
    const { updateNodeConfig } = useWorkflowStore.getState();
    updateNodeConfig("n1", { fields: [{ id: "f1" }] });

    const node = useWorkflowStore.getState().nodes.find((n) => n.id === "n1")!;
    expect((node.data.config as { fields: unknown[] }).fields).toHaveLength(1);
  });
});

describe("setNodes", () => {
  beforeEach(resetStore);

  it("the function form resolves against the latest state, not a stale snapshot passed earlier", () => {
    // Mirrors the real bug: Canvas.tsx's onNodesChange used to call
    // setNodes(applyNodeChanges(changes, nodes)) with a `nodes` array
    // closed over from the last render. If another store update (e.g.
    // updateNodeConfig from a node's own click handler) landed in between,
    // that closure-based call would overwrite it with stale data. The
    // function form setNodes((current) => ...) must not do that.
    const { updateNodeConfig, setNodes } = useWorkflowStore.getState();

    updateNodeConfig("n1", { fields: [{ id: "f1" }] });
    // Simulate a React-Flow-originated change (e.g. a selection toggle)
    // landing after the config update, using the function form.
    setNodes((current) => current.map((n) => ({ ...n, selected: true })));

    const node = useWorkflowStore.getState().nodes.find((n) => n.id === "n1")!;
    expect((node.data.config as { fields: unknown[] }).fields).toHaveLength(1);
    expect(node.selected).toBe(true);
  });
});

function resetGeminiGraph() {
  useWorkflowStore.setState({
    workflowId: null,
    nodes: [
      {
        id: "inputs",
        type: "request-inputs",
        position: { x: 0, y: 0 },
        deletable: false,
        data: {
          kind: "request-inputs",
          config: { fields: [{ id: "f1", name: "text_field", type: "text_field", value: "hi" }] },
          status: "pending",
        },
      },
      {
        id: "gemini1",
        type: "gemini",
        position: { x: 200, y: 0 },
        deletable: true,
        data: {
          kind: "gemini",
          config: { model: "gemini-2.5-flash-lite", prompt: "", systemPrompt: "", temperature: 1, maxOutputTokens: 2048 },
          status: "pending",
        },
      },
    ],
    edges: [{ id: "e1", type: "nextflow-edge", source: "inputs", sourceHandle: "f1", target: "gemini1", targetHandle: "prompt" }],
    selection: [],
    dirty: false,
    savedAt: null,
    runId: null,
    past: [],
    future: [],
  });
}

describe("duplicateNode / duplicateNodeWithEdges / toggleNodeLocked", () => {
  beforeEach(resetGeminiGraph);

  it("duplicateNode clones config and position-offsets, but creates no edges", () => {
    const { duplicateNode } = useWorkflowStore.getState();
    duplicateNode("gemini1");

    const state = useWorkflowStore.getState();
    expect(state.nodes).toHaveLength(3);
    const clone = state.nodes.find((n) => n.id !== "inputs" && n.id !== "gemini1")!;
    expect(clone.position).toEqual({ x: 248, y: 48 });
    expect(state.edges).toHaveLength(1); // unchanged
    expect(state.selection).toEqual([clone.id]);
  });

  it("duplicateNodeWithEdges recreates valid incident edges onto the clone", () => {
    const { duplicateNodeWithEdges } = useWorkflowStore.getState();
    duplicateNodeWithEdges("gemini1");

    const state = useWorkflowStore.getState();
    const clone = state.nodes.find((n) => n.id !== "inputs" && n.id !== "gemini1")!;
    expect(state.edges).toHaveLength(2);
    expect(state.edges.some((e) => e.source === "inputs" && e.target === clone.id && e.targetHandle === "prompt")).toBe(
      true,
    );
  });

  it("duplicateNodeWithEdges silently skips an edge that would violate validateConnection", () => {
    // Duplicating "inputs" (the source) would try to wire the clone into
    // gemini1's `prompt` handle too — but that single-input handle is
    // already occupied by the original edge, so it must be skipped, not
    // forced through.
    const { duplicateNodeWithEdges } = useWorkflowStore.getState();
    duplicateNodeWithEdges("inputs");

    const state = useWorkflowStore.getState();
    expect(state.edges).toHaveLength(1); // no new edge was added
    expect(state.nodes).toHaveLength(3); // the clone itself still exists
  });

  it("toggleNodeLocked flips data.locked and the node's draggable flag, and is undoable", () => {
    const { toggleNodeLocked, undo } = useWorkflowStore.getState();
    toggleNodeLocked("gemini1");

    let node = useWorkflowStore.getState().nodes.find((n) => n.id === "gemini1")!;
    expect(node.data.locked).toBe(true);
    expect(node.draggable).toBe(false);

    undo();
    node = useWorkflowStore.getState().nodes.find((n) => n.id === "gemini1")!;
    expect(node.data.locked).toBeFalsy();
  });
});

describe("sticky notes", () => {
  beforeEach(resetStore);

  it("addStickyNote never enters the executable graph's nodes — only stickyNotes", () => {
    const { addStickyNote } = useWorkflowStore.getState();
    addStickyNote({ x: 10, y: 20 });

    const { nodes, edges } = useWorkflowStore.getState();
    const graph = toWorkflowGraph(nodes, edges);

    expect(graph.nodes).toHaveLength(1); // only the seeded request-inputs node
    expect(graph.nodes.every((n) => n.kind !== undefined)).toBe(true);
    expect(graph.stickyNotes).toHaveLength(1);
    expect(graph.stickyNotes[0]).toMatchObject({ position: { x: 10, y: 20 }, color: "#FEF08A", text: "" });
  });

  it("updateStickyNote patches style/text without touching real nodes", () => {
    const { addStickyNote, updateStickyNote } = useWorkflowStore.getState();
    addStickyNote({ x: 0, y: 0 });
    const noteId = useWorkflowStore.getState().nodes.find((n) => n.type === "sticky-note")!.id;

    updateStickyNote(noteId, { text: "hello", color: "#BFDBFE", bold: true, fontSize: 20, fontFamily: "serif" });

    const graph = toWorkflowGraph(useWorkflowStore.getState().nodes, useWorkflowStore.getState().edges);
    expect(graph.stickyNotes[0]).toMatchObject({
      text: "hello",
      color: "#BFDBFE",
      bold: true,
      fontSize: 20,
      fontFamily: "serif",
    });
    expect(graph.nodes).toHaveLength(1); // request-inputs node untouched
  });

  it("resizeStickyNote updates size, clamped to the 220x160 minimum by the caller's UI layer", () => {
    const { addStickyNote, resizeStickyNote } = useWorkflowStore.getState();
    addStickyNote({ x: 0, y: 0 });
    const noteId = useWorkflowStore.getState().nodes.find((n) => n.type === "sticky-note")!.id;

    resizeStickyNote(noteId, { width: 400, height: 300 });

    const graph = toWorkflowGraph(useWorkflowStore.getState().nodes, useWorkflowStore.getState().edges);
    expect(graph.stickyNotes[0]?.size).toEqual({ width: 400, height: 300 });
  });

  it("removeStickyNote removes it but is independent of removeNode's deletable guard", () => {
    const { addStickyNote, removeStickyNote } = useWorkflowStore.getState();
    addStickyNote({ x: 0, y: 0 });
    const noteId = useWorkflowStore.getState().nodes.find((n) => n.type === "sticky-note")!.id;

    removeStickyNote(noteId);

    expect(useWorkflowStore.getState().nodes.some((n) => n.id === noteId)).toBe(false);
  });

  it("load() hydrates stickyNotes from the persisted graph back into the unified nodes array", () => {
    const { load } = useWorkflowStore.getState();
    load(
      "wf1",
      {
        nodes: [],
        edges: [],
        stickyNotes: [
          {
            id: "s1",
            position: { x: 5, y: 5 },
            size: { width: 220, height: 160 },
            text: "note",
            color: "#FEF08A",
            bold: false,
            fontSize: 16,
            fontFamily: "sans",
          },
        ],
      },
      1,
    );

    const note = useWorkflowStore.getState().nodes.find((n) => n.id === "s1");
    expect(note?.type).toBe("sticky-note");
    expect(note?.data).toMatchObject({ isStickyNote: true, text: "note" });
  });
});
