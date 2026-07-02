import { describe, expect, it } from "vitest";
import { isCompatible, PORT_TYPES } from "./ports";

describe("isCompatible", () => {
  it("allows identical types", () => {
    expect(isCompatible("text", "text")).toBe(true);
    expect(isCompatible("image", "image")).toBe(true);
  });

  it("rejects mismatched concrete types", () => {
    expect(isCompatible("image", "text")).toBe(false);
    expect(isCompatible("video", "audio")).toBe(false);
  });

  it("treats 'any' as the top type on either side", () => {
    expect(isCompatible("any", "text")).toBe(true);
    expect(isCompatible("text", "any")).toBe(true);
    expect(isCompatible("any", "any")).toBe(true);
  });

  it("exhaustive matrix: every (source, target) pair over all 6 port types", () => {
    for (const source of PORT_TYPES) {
      for (const target of PORT_TYPES) {
        const expected = source === "any" || target === "any" || source === target;
        expect(isCompatible(source, target)).toBe(expected);
      }
    }
  });
});
