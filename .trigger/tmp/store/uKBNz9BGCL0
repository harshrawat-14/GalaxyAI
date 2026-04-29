import {
  defineConfig
} from "../../../../chunk-KLFD6HWA.mjs";
import "../../../../chunk-JAQFRGM5.mjs";
import {
  init_esm
} from "../../../../chunk-OOYLPNSB.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  // Replace with your Trigger.dev project ref (proj_xxxxxxxxxxxxxxxx).
  // Find it in the Trigger.dev dashboard → Project Settings.
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_replace_me",
  runtime: "node",
  logLevel: "log",
  // Allow long FFmpeg / LLM jobs (seconds).
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 2,
      minTimeoutInMs: 1e3,
      maxTimeoutInMs: 1e4,
      factor: 2,
      randomize: true
    }
  },
  dirs: ["./src/trigger"],
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
