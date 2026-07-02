import { describe, expect, it } from "vitest";
import {
  createWorkflowSchema,
  graphEdgeSchema,
  graphNodeSchema,
  runRequestSchema,
  stickyNoteSchema,
  updateWorkflowSchema,
  workflowGraphSchema,
} from "./schema";

const validNode = { id: "n1", kind: "gemini", position: { x: 0, y: 0 }, config: {} };
const validEdge = { id: "e1", source: "n1", sourceHandle: "out", target: "n2", targetHandle: "in" };
const validStickyNote = {
  id: "s1",
  position: { x: 0, y: 0 },
  size: { width: 220, height: 160 },
  text: "hello",
  color: "#FEF08A",
  bold: false,
  fontSize: 16,
  fontFamily: "sans",
};

describe("graphNodeSchema", () => {
  it("accepts a well-formed node", () => {
    expect(graphNodeSchema.safeParse(validNode).success).toBe(true);
  });

  it("rejects an unknown node kind", () => {
    expect(graphNodeSchema.safeParse({ ...validNode, kind: "not-a-kind" }).success).toBe(false);
  });

  it("defaults locked to false when omitted", () => {
    const result = graphNodeSchema.parse(validNode);
    expect(result.locked).toBe(false);
  });

  it("rejects a missing position", () => {
    const rest: Record<string, unknown> = { ...validNode };
    delete rest.position;
    expect(graphNodeSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty id", () => {
    expect(graphNodeSchema.safeParse({ ...validNode, id: "" }).success).toBe(false);
  });
});

describe("graphEdgeSchema", () => {
  it("accepts a well-formed edge", () => {
    expect(graphEdgeSchema.safeParse(validEdge).success).toBe(true);
  });

  it("rejects a missing handle", () => {
    const rest: Record<string, unknown> = { ...validEdge };
    delete rest.sourceHandle;
    expect(graphEdgeSchema.safeParse(rest).success).toBe(false);
  });
});

describe("stickyNoteSchema", () => {
  it("accepts a well-formed sticky note", () => {
    expect(stickyNoteSchema.safeParse(validStickyNote).success).toBe(true);
  });

  it("rejects a zero/negative size", () => {
    expect(
      stickyNoteSchema.safeParse({ ...validStickyNote, size: { width: 0, height: 160 } }).success,
    ).toBe(false);
  });

  it("rejects a font size outside the 8-72 range", () => {
    expect(stickyNoteSchema.safeParse({ ...validStickyNote, fontSize: 200 }).success).toBe(false);
  });

  it("defaults text/color/bold/fontSize/fontFamily when omitted", () => {
    const result = stickyNoteSchema.parse({ id: "s1", position: { x: 0, y: 0 }, size: { width: 220, height: 160 } });
    expect(result).toMatchObject({ text: "", color: "#FEF08A", bold: false, fontSize: 16, fontFamily: "sans" });
  });
});

describe("workflowGraphSchema", () => {
  it("accepts an empty graph", () => {
    expect(workflowGraphSchema.safeParse({ nodes: [], edges: [] }).success).toBe(true);
  });

  it("defaults stickyNotes to [] for graphs persisted before this feature existed", () => {
    const result = workflowGraphSchema.parse({ nodes: [], edges: [] });
    expect(result.stickyNotes).toEqual([]);
  });

  it("round-trips sticky notes as a top-level collection, never inside nodes", () => {
    const result = workflowGraphSchema.parse({ nodes: [validNode], edges: [], stickyNotes: [validStickyNote] });
    expect(result.nodes).toEqual([{ ...validNode, locked: false }]);
    expect(result.stickyNotes).toEqual([validStickyNote]);
  });

  it("rejects a malformed node inside the array", () => {
    const result = workflowGraphSchema.safeParse({ nodes: [{ id: "n1" }], edges: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed sticky note inside the array", () => {
    const result = workflowGraphSchema.safeParse({
      nodes: [],
      edges: [],
      stickyNotes: [{ id: "s1" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("createWorkflowSchema", () => {
  it("defaults the name when omitted", () => {
    const result = createWorkflowSchema.parse({});
    expect(result.name).toBe("Untitled Workflow");
  });

  it("rejects an empty string name", () => {
    expect(createWorkflowSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a name over 120 characters", () => {
    expect(createWorkflowSchema.safeParse({ name: "x".repeat(121) }).success).toBe(false);
  });
});

describe("updateWorkflowSchema", () => {
  it("accepts a partial update with only name", () => {
    expect(updateWorkflowSchema.safeParse({ name: "Renamed" }).success).toBe(true);
  });

  it("accepts an empty object (no-op update)", () => {
    expect(updateWorkflowSchema.safeParse({}).success).toBe(true);
  });

  it("rejects a non-integer expectedVersion", () => {
    expect(updateWorkflowSchema.safeParse({ expectedVersion: 1.5 }).success).toBe(false);
  });

  it("accepts a valid integer expectedVersion", () => {
    expect(updateWorkflowSchema.safeParse({ expectedVersion: 3 }).success).toBe(true);
  });
});

describe("runRequestSchema", () => {
  const baseGraph = { nodes: [validNode], edges: [] };

  it("defaults nodeIds to an empty array", () => {
    const result = runRequestSchema.parse({ scope: "full", graph: baseGraph });
    expect(result.nodeIds).toEqual([]);
  });

  it("rejects an invalid scope value", () => {
    expect(runRequestSchema.safeParse({ scope: "everything", graph: baseGraph }).success).toBe(false);
  });

  it("accepts single/partial scopes with explicit nodeIds", () => {
    expect(
      runRequestSchema.safeParse({ scope: "single", nodeIds: ["n1"], graph: baseGraph }).success,
    ).toBe(true);
  });

  it("rejects a missing graph", () => {
    expect(runRequestSchema.safeParse({ scope: "full" }).success).toBe(false);
  });
});
