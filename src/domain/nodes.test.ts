import { describe, expect, it } from "vitest";
import { getNodeSpec, NODE_KINDS, REQUEST_FIELD_TYPES, requestFieldSchema } from "./nodes";

describe("NodeSpec.description", () => {
  it("every node kind has a non-empty info-popover description", () => {
    for (const kind of NODE_KINDS) {
      expect(getNodeSpec(kind).description.length).toBeGreaterThan(0);
    }
  });
});

describe("Request-Inputs spec", () => {
  const spec = getNodeSpec("request-inputs");

  it("is not deletable and is not executable", () => {
    expect(spec.deletable).toBe(false);
    expect(spec.executable).toBe(false);
  });

  it("has no input ports", () => {
    expect(spec.inputs(spec.defaultConfig())).toEqual([]);
  });

  it("derives one output port per field, typed by field type", () => {
    const config = {
      fields: [
        { id: "f1", name: "text_field", type: "text_field" as const, value: null },
        { id: "f2", name: "number_field", type: "number_field" as const, value: null },
        { id: "f3", name: "boolean_field", type: "boolean_field" as const, value: null },
        { id: "f4", name: "image_field", type: "image_field" as const, value: null },
      ],
    };
    const outputs = spec.outputs(config);
    // number_field/boolean_field output a `text` handle (serialized to string)
    // rather than a dedicated PortType — see docs/prompts/request-inputs-add-menu.md.
    expect(outputs).toEqual([
      { id: "f1", label: "text_field", type: "text" },
      { id: "f2", label: "number_field", type: "text" },
      { id: "f3", label: "boolean_field", type: "text" },
      { id: "f4", label: "image_field", type: "image" },
    ]);
  });

  it("supports exactly the four field types, each storing value as a nullable string", () => {
    expect(REQUEST_FIELD_TYPES).toEqual(["text_field", "number_field", "boolean_field", "image_field"]);
    for (const type of REQUEST_FIELD_TYPES) {
      const parsed = requestFieldSchema.parse({ id: "f1", name: "f1", type, value: null });
      expect(parsed.value).toBeNull();
      const withValue = requestFieldSchema.parse({ id: "f1", name: "f1", type, value: "true" });
      expect(withValue.value).toBe("true");
    }
  });
});

describe("Crop Image spec", () => {
  const spec = getNodeSpec("crop-image");

  it("defaults to the full frame (0/0/100/100) with no manual image set", () => {
    expect(spec.defaultConfig()).toEqual({ imageUrl: null, x: 0, y: 0, width: 100, height: 100 });
  });

  it("manualValue falls back to imageUrl for input_image, undefined when unset", () => {
    const defaults = spec.defaultConfig() as { imageUrl: string | null; x: number; y: number; width: number; height: number };
    expect(spec.manualValue?.(defaults, "input_image")).toBeUndefined();
    expect(spec.manualValue?.({ ...defaults, imageUrl: "https://cdn.example.com/a.png" }, "input_image")).toBe(
      "https://cdn.example.com/a.png",
    );
  });

  it("is deletable and executable", () => {
    expect(spec.deletable).toBe(true);
    expect(spec.executable).toBe(true);
  });

  it("has one required image input, four wireable text params (x/y/width/height), and one image output", () => {
    const inputs = spec.inputs(spec.defaultConfig());
    expect(inputs).toEqual([
      { id: "input_image", label: "Input Image", type: "image", required: true },
      { id: "x", label: "X Position (%)", type: "text" },
      { id: "y", label: "Y Position (%)", type: "text" },
      { id: "width", label: "Width (%)", type: "text" },
      { id: "height", label: "Height (%)", type: "text" },
    ]);
    expect(spec.outputs(spec.defaultConfig())).toEqual([
      { id: "output_image", label: "Output Image", type: "image" },
    ]);
  });

  it("x/y/width/height manualValue always reflects config, regardless of any wiring", () => {
    const config = { ...(spec.defaultConfig() as object), x: 12, y: 34, width: 56, height: 78 };
    expect(spec.manualValue?.(config, "x")).toBe(12);
    expect(spec.manualValue?.(config, "y")).toBe(34);
    expect(spec.manualValue?.(config, "width")).toBe(56);
    expect(spec.manualValue?.(config, "height")).toBe(78);
  });
});

describe("Gemini spec", () => {
  const spec = getNodeSpec("gemini");

  it("is deletable and executable", () => {
    expect(spec.deletable).toBe(true);
    expect(spec.executable).toBe(true);
  });

  it("the vision image input handle accepts multiple connections", () => {
    const inputs = spec.inputs(spec.defaultConfig());
    const image = inputs.find((p) => p.id === "image");
    expect(image?.multiple).toBe(true);
  });

  it("prompt is required; system_prompt/video/audio/file are not", () => {
    const inputs = spec.inputs(spec.defaultConfig());
    const byId = Object.fromEntries(inputs.map((p) => [p.id, p]));
    expect(byId.prompt?.required).toBe(true);
    expect(byId.system_prompt?.required).toBeUndefined();
    expect(byId.video?.required).toBeUndefined();
    expect(byId.audio?.required).toBeUndefined();
    expect(byId.file?.required).toBeUndefined();
  });

  it("has a single text output", () => {
    expect(spec.outputs(spec.defaultConfig())).toEqual([
      { id: "response", label: "Response", type: "text" },
    ]);
  });

  it("every Settings param is a wireable text port, none required", () => {
    const inputs = spec.inputs(spec.defaultConfig());
    const byId = Object.fromEntries(inputs.map((p) => [p.id, p]));
    for (const id of ["temperature", "max_output_tokens", "top_p", "top_k", "stop_sequences", "seed", "json_mode", "reasoning"]) {
      expect(byId[id]?.type).toBe("text");
      expect(byId[id]?.required).toBeUndefined();
    }
  });

  it("Settings param manualValue always reflects config, regardless of any wiring", () => {
    const config = {
      ...(spec.defaultConfig() as object),
      temperature: 0.4,
      maxOutputTokens: 512,
      topP: 0.8,
      topK: 20,
      stopSequences: "END,STOP",
      seed: 42,
      jsonMode: true,
      reasoning: true,
    };
    expect(spec.manualValue?.(config, "temperature")).toBe(0.4);
    expect(spec.manualValue?.(config, "max_output_tokens")).toBe(512);
    expect(spec.manualValue?.(config, "top_p")).toBe(0.8);
    expect(spec.manualValue?.(config, "top_k")).toBe(20);
    expect(spec.manualValue?.(config, "stop_sequences")).toBe("END,STOP");
    expect(spec.manualValue?.(config, "seed")).toBe(42);
    expect(spec.manualValue?.(config, "json_mode")).toBe(true);
    expect(spec.manualValue?.(config, "reasoning")).toBe(true);
  });
});

describe("Response spec", () => {
  const spec = getNodeSpec("response");

  it("is not deletable and is not executable", () => {
    expect(spec.deletable).toBe(false);
    expect(spec.executable).toBe(false);
  });

  it("has one required 'any' input and no outputs", () => {
    expect(spec.inputs(spec.defaultConfig())).toEqual([
      { id: "result", label: "result", type: "any", required: true, multiple: true },
    ]);
    expect(spec.outputs(spec.defaultConfig())).toEqual([]);
  });
});
