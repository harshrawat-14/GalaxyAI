"use client";

import { Coins, Gauge } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DAILY_TOKEN_QUOTA, estimateBalanceM, estimateGraphTokens, formatM } from "@/lib/estimates";
import { isStickyNoteNode, useWorkflowStore, type NextFlowNode } from "@/store/workflow-store";

interface DailyUsage {
  used: number;
  dailyLimit: number;
  remaining: number;
}

function Pill({
  testId,
  icon,
  label,
  value,
  title,
}: {
  testId: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div
      data-testid={testId}
      title={title}
      className="flex h-10 items-center gap-1.5 rounded-[10px] bg-card-bg px-3 py-2 shadow-card"
    >
      <span className="shrink-0 text-text-muted">{icon}</span>
      <span className="text-xs text-label-muted">{label}</span>
      <span className="text-sm font-semibold text-text-strong">{value}</span>
    </div>
  );
}

/**
 * Est/Bal pills, out-of-PS scope (docs/UI_PARITY_FIXES.md scope warning).
 * Both values always go through the shared estimator
 * (docs/prompts/placeholder-estimates.md / src/lib/estimates.ts) so they're
 * never blank: Est is a deterministic token estimate of the current graph;
 * Bal is explicitly NOT a real Google AI Studio balance — no such endpoint
 * exists on the free tier — it's the placeholder daily token quota minus a
 * proportional share of today's real run-count usage, labeled as
 * approximate via its tooltip. Neither pill is presented as exact.
 */
export function UsagePills({ refreshKey }: { refreshKey: number }) {
  const nodes = useWorkflowStore((s) => s.nodes);
  // Defaults to "no usage yet today" rather than null, so the Bal pill never
  // renders blank/"—" while the GET /api/usage fetch is in flight.
  const [usage, setUsage] = useState<DailyUsage>({ used: 0, dailyLimit: 1, remaining: 1 });

  // Built directly from the subscribed `nodes` array (not the imperative
  // toGraph() action) so this memo's dependency is exactly what it reads —
  // estimateGraphTokens only needs node kind/config, not edges.
  const estTokens = useMemo(
    () =>
      estimateGraphTokens({
        nodes: nodes
          .filter((n): n is NextFlowNode => !isStickyNoteNode(n))
          .map((n) => ({ id: n.id, kind: n.data.kind, position: n.position, config: n.data.config })),
      }),
    [nodes],
  );

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => res.json())
      .then(setUsage);
  }, [refreshKey]);

  // The real per-day tracking we have is a run COUNT (usageCounter.ts), not
  // a token count — so the token-quota-based Bal proxy depletes in
  // proportion to that count rather than inventing a separate per-token
  // counter, while still always rendering via the shared formatter.
  const usedFraction = usage.dailyLimit > 0 ? usage.used / usage.dailyLimit : 0;
  const usedTokensToday = usedFraction * DAILY_TOKEN_QUOTA;

  return (
    <div className="flex items-center gap-2">
      <Pill
        testId="usage-est-pill"
        icon={<Gauge size={16} />}
        label="Est"
        value={formatM(estTokens)}
        title="Estimated tokens for the current graph (chars/4 heuristic), not a billed amount."
      />
      <Pill
        testId="usage-bal-pill"
        icon={<Coins size={16} />}
        label="Bal"
        value={estimateBalanceM(usedTokensToday)}
        title="Approximate free-tier usage, not a billed balance."
      />
    </div>
  );
}
