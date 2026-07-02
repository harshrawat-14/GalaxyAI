import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Inter, loaded via next/font/google in layout.tsx as --font-inter —
        // falls back to the platform's native sans stack (SF Pro on Mac/iOS)
        // rather than a generic default.
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      // Single source of truth for the light theme + dark MiniMap exception
      // (docs/UI_PARITY_FIXES.md). Referenced everywhere via these names
      // instead of raw zinc/violet utilities, so the palette can't drift
      // out of sync between components.
      colors: {
        canvas: { bg: "#F4F4F4" },
        card: { bg: "#FFFFFF", border: "#ECECEE" },
        // CanvasSidebar's own background — distinct from card-bg (#FFFFFF)
        // even though both are near-white, so the two can diverge without
        // an arbitrary hex hardcoded at the call site.
        sidebar: { bg: "#F0F0F0" },
        divider: "#E4E4E7",
        control: { hover: "#F4F4F5" },
        text: { strong: "#18181B", muted: "#71717A" },
        label: { muted: "#6B7280" },
        dot: "#CACACA",
        run: { DEFAULT: "#6D5DFB", hover: "#5B4BE0" },
        runpill: { bg: "#DCFCE7", text: "#16A34A" },
        mm: { bg: "#18181B", border: "#27272A", previewAll: "#A88BFA" },
        // Light surfaces for the API tab's code panel + doc/JSON boxes and
        // the Playground Output card's inner region (docs/UI_PARITY_FIXES.md
        // light-theme code styling) — distinct from canvas-bg since these
        // sit inside a card rather than being the page background.
        surface: { subtle: "#FAFAFA", bar: "#F4F4F5" },
        // Detail-page (/workflow/[id]) tab-strip + content-area background,
        // and the API tab's doc/JSON/code cell fill — both #F9F9F9 per
        // docs/prompts/canvas-and-detail-refinements.md, distinct from (and
        // superseding ApiTab's prior use of) surface.subtle's #FAFAFA.
        "detail-content": "#F9F9F9",
        "api-surface": "#F9F9F9",
        // Card/control fill used specifically by components inside the
        // detail page's Playground/API/Workflow tabs — a near-white shade
        // distinct from the global card-bg (#FFFFFF) used everywhere else.
        "detail-card": "#FBFBFA",
        // The detail page's back-arrow button (shared across all 3 tabs).
        "detail-back": "#F5F5F5",
        // Builder-canvas minimap node fills: static (Request-Inputs/Response/
        // sticky notes) vs active/executable (Gemini, Crop). The read-only
        // Workflow-preview tab's minimap instead colors every node the same
        // (mm.previewAll), since it isn't distinguishing node roles.
        "mm-static": "#444444",
        "mm-active": "#22C55E",
        code: {
          keyword: "#7C3AED",
          string: "#16A34A",
          number: "#2563EB",
          fn: "#2563EB",
          comment: "#9CA3AF",
          plain: "#18181B",
        },
        type: {
          text: "#F59E0B",
          image: "#3B82F6",
          video: "#EC4899",
          audio: "#A855F7",
          file: "#71717A",
          result: "#22C55E",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.05)",
        "card-hover": "0 4px 6px rgba(0,0,0,.07), 0 12px 32px rgba(0,0,0,.08)",
        // Selected state uses Tailwind's built-in ring-2 ring-indigo-500
        // (indigo-500 is already #6366F1) so it composes with shadow-card
        // via Tailwind's shared box-shadow variables, instead of a separate
        // shadow utility that would just override it.
      },
      borderRadius: {
        card: "12px",
        panel: "12px",
        run: "12px",
      },
      keyframes: {
        // Pulsating glow on nodes currently executing.
        "node-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(139, 92, 246, 0.0)" },
          "50%": { boxShadow: "0 0 0 6px rgba(139, 92, 246, 0.35)" },
        },
      },
      animation: {
        "node-glow": "node-glow 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
