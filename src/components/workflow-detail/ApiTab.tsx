"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

const LANGUAGES = ["Python", "cURL", "JavaScript"] as const;
type Language = (typeof LANGUAGES)[number];

// Static, verbatim per-language templates (product-owner supplied) — not
// derived from the real workflow/field names, since these are meant as a
// fixed reference example, not a live-generated snippet.
const SNIPPETS: Record<Language, string> = {
  Python: `import requests
import time
import json

api_key = "YOUR_API_KEY"
url = "https://api.magica.com/api/v1/runs"

data = {
    "workflowId": "cmqqwct8a0000kz04dzsyifx8",
    "values": {
        "node_1772800705319_request": {
            "Car prompt": "your text here"
        }
    }
}

def poll_for_result(run_id):
    """Poll the API until the generation is complete"""
    poll_url = f"https://api.magica.com/api/v1/runs/{run_id}?inDetails=false"
    while True:
        response = requests.get(
            poll_url,
            headers={'Authorization': f'Bearer {api_key}'}
        )
        result = response.json()

        if result['status'] == 'COMPLETED':
            return result
        elif result['status'] in ['FAILED', 'CANCELED']:
            raise Exception(f"Run failed: {result.get('error', 'Unknown error')}")

        time.sleep(7)

# Start the run
response = requests.post(
    url,
    json=data,
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
)

result = response.json()
run_id = result['runId']
print(f"Run started: {run_id}")

# Poll for result
final = poll_for_result(run_id)
print(json.dumps(final, indent=2))`,
  cURL: `curl -X POST 'https://api.magica.com/api/v1/runs' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -d '{
  "workflowId": "cmqqwct8a0000kz04dzsyifx8",
  "values": {
    "node_1772800705319_request": {
      "Car prompt": "your text here"
    }
  }
}'`,
  JavaScript: `const response = await fetch('https://api.magica.com/api/v1/runs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY',
  },
  body: JSON.stringify({
  "workflowId": "cmqqwct8a0000kz04dzsyifx8",
  "values": {
    "node_1772800705319_request": {
      "Car prompt": "your text here"
    }
  }
}),
});

const data = await response.json();
const runId = data.runId;
console.log('Run started:', runId);

// Poll for result
async function pollWorkflowRunResult(runId) {
  while (true) {
    const res = await fetch(\`https://api.magica.com/api/v1/runs/\${runId}?inDetails=false\`, {
      headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
    });
    const result = await res.json();

    if (result.status === 'COMPLETED') {
      return result;
    } else if (['FAILED', 'CANCELED'].includes(result.status)) {
      throw new Error(\`Run failed: \${result.error || 'Unknown error'}\`);
    }

    await new Promise(r => setTimeout(r, 7000));
  }
}

const final = await pollWorkflowRunResult(runId);
console.log(final);`,
};

const LANG_KEYWORDS: Record<Language, ReadonlySet<string>> = {
  Python: new Set(["import", "from", "as", "def", "return", "print", "True", "False", "None"]),
  cURL: new Set(["curl"]),
  JavaScript: new Set(["const", "let", "var", "await", "async", "function", "return", "new", "typeof"]),
};

// Token regex, alternatives tried left-to-right at each position: a comment
// or string match consumes its whole span (e.g. an embedded "//" inside a
// string is never reconsidered as a comment start, since the regex already
// committed to — and advanced past — the string token covering it).
const TOKEN_PATTERN = /(\/\/.*|#.*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

interface CodeToken {
  text: string;
  className: string;
}

function tokenizeLine(line: string, keywords: ReadonlySet<string>): CodeToken[] {
  const tokens: CodeToken[] = [];
  let lastIndex = 0;
  for (const m of line.matchAll(TOKEN_PATTERN)) {
    if (m.index > lastIndex) tokens.push({ text: line.slice(lastIndex, m.index), className: "text-code-plain" });
    const [full, comment, str, num, word] = m;
    if (comment) tokens.push({ text: full, className: "text-code-comment" });
    else if (str) tokens.push({ text: full, className: "text-code-string" });
    else if (num) tokens.push({ text: full, className: "text-code-number" });
    else if (word) {
      const isCall = line[m.index + full.length] === "(";
      if (keywords.has(word)) tokens.push({ text: full, className: "text-code-keyword font-medium" });
      else if (isCall) tokens.push({ text: full, className: "text-code-fn" });
      else tokens.push({ text: full, className: "text-code-plain" });
    }
    lastIndex = m.index + full.length;
  }
  if (lastIndex < line.length) tokens.push({ text: line.slice(lastIndex), className: "text-code-plain" });
  return tokens;
}

function CodeBlock({ code, language }: { code: string; language: Language }) {
  const lines = code.split("\n");
  const keywords = LANG_KEYWORDS[language];
  return (
    <pre className="overflow-x-auto rounded-lg border border-divider bg-api-surface p-4 font-mono text-[13px] leading-6">
      <code>
        {lines.map((line, i) => (
          <div key={i} className="flex gap-4">
            <span className="w-5 shrink-0 select-none text-right text-code-comment">{i + 1}</span>
            <span className="whitespace-pre">
              {tokenizeLine(line, keywords).map((token, j) => (
                <span key={j} className={token.className}>
                  {token.text}
                </span>
              ))}
            </span>
          </div>
        ))}
      </code>
    </pre>
  );
}

function JsonBox({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-divider bg-api-surface p-3 font-mono text-xs text-text-muted">
      {children}
    </pre>
  );
}

// Summary (inDetails=false) omits nodeRuns; detailed (inDetails=true) includes
// the per-node array — these are two distinct static templates, not one
// dynamically trimmed, so each stays exactly representative of its mode.
const SUMMARY_RESPONSE = `{
  "id": "run_abc123...",
  "workflowId": "wf_xyz789",
  "workflowName": "Product Background Removal",
  "status": "COMPLETED",
  "mode": "full",
  "startedAt": "2026-06-23T10:15:00.000Z",
  "finishedAt": "2026-06-23T10:15:42.000Z",
  "output": { "result": "https://cdn.example.com/output.png" }
}`;

const DETAILED_RESPONSE = `{
  "id": "run_abc123...",
  "workflowId": "wf_xyz789",
  "workflowName": "Product Background Removal",
  "status": "COMPLETED",
  "mode": "full",
  "startedAt": "2026-06-23T10:15:00.000Z",
  "finishedAt": "2026-06-23T10:15:42.000Z",
  "nodeRuns": [
    {
      "id": "nr_resp123...",
      "nodeId": "node_resp...",
      "nodeType": "response",
      "status": "COMPLETED",
      "startedAt": "2026-06-23T10:15:01.000Z",
      "finishedAt": "2026-06-23T10:15:40.000Z",
      "error": null,
      "input": null,
      "output": { "result": "https://cdn.example.com/output.png" }
    }
  ]
}`;

export function ApiTab() {
  const [language, setLanguage] = useState<Language>("Python");
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = SNIPPETS[language];

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    // Each column is height-capped to the viewport (minus the page's own
    // header/tabs chrome) with its own internal scroll — the detail page
    // itself must never scroll while the API tab is active.
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex max-h-[calc(100vh-220px)] flex-col overflow-hidden rounded-card border border-card-border bg-detail-card shadow-card">
        <div className="flex shrink-0 items-center justify-between border-b border-divider bg-surface-bar px-4 py-2.5">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            data-testid="api-language-select"
            className="rounded-lg border border-card-border bg-detail-card px-2 py-1.5 text-sm text-text-strong"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-testid="api-copy-button"
            onClick={copySnippet}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm ${
              copied ? "border-green-200 text-green-600" : "border-card-border text-text-muted hover:bg-control-hover"
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="overflow-y-auto">
          <CodeBlock code={snippet} language={language} />
        </div>
      </div>

      <div className="max-h-[calc(100vh-220px)] space-y-6 overflow-y-auto">
        <section>
          <h3 className="text-[15px] font-semibold text-text-strong">API Endpoint</h3>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-divider bg-api-surface px-3 py-2">
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">POST</span>
            <span className="font-mono text-sm text-text-muted">{origin || "https://your-app.example.com"}/api/v1/runs</span>
          </div>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-text-strong">Response Format</h3>
          <p className="mt-1 text-sm text-label-muted">
            The start endpoint returns a <code>runId</code>. Poll <code>GET /v1/runs/{"{runId}"}</code> to check status.
          </p>
          <div className="mt-2">
            <JsonBox>{`{ "runId": "run_abc123..." }`}</JsonBox>
          </div>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-text-strong">Polling Format</h3>
          <p className="mt-1 text-sm text-label-muted">
            Poll <code>GET /v1/runs/{"{runId}"}</code> until status is terminal:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-control-hover px-2.5 py-1 text-[13px] text-text-muted">Queued</span>
            <span className="rounded-md bg-control-hover px-2.5 py-1 text-[13px] text-text-muted">Running</span>
            <span className="rounded-md bg-runpill-bg px-2.5 py-1 text-[13px] text-runpill-text">Completed</span>
            <span className="rounded-md bg-red-100 px-2.5 py-1 text-[13px] text-red-600">Canceled</span>
            <span className="rounded-md bg-red-100 px-2.5 py-1 text-[13px] text-red-600">Failed</span>
          </div>
          <div className="mt-2">
            <JsonBox>{`GET /v1/runs/{runId}?inDetails=${showDetails}`}</JsonBox>
          </div>
          <div className="mt-2 flex items-center gap-2.5 text-sm text-text-muted">
            <span>inDetails</span>
            <button
              type="button"
              role="switch"
              aria-checked={showDetails}
              data-testid="indetails-toggle"
              onClick={() => setShowDetails((v) => !v)}
              className={`relative h-5 w-9 shrink-0 overflow-hidden rounded-full transition-colors ${
                showDetails ? "bg-text-strong" : "bg-control-hover"
              }`}
            >
              {/* Explicit `left-0.5` base position (rather than relying on
                  the implicit auto-left of an absolutely-positioned element)
                  — the thumb otherwise drifted past the track's right edge
                  in the "on" state and overlapped the adjacent status text. */}
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  showDetails ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span>{showDetails ? "true - all node runs" : "false - response node only"}</span>
          </div>
          <div className="mt-2">
            <p className="mb-1 text-xs text-label-muted">Sample response:</p>
            <JsonBox>{showDetails ? DETAILED_RESPONSE : SUMMARY_RESPONSE}</JsonBox>
          </div>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-text-strong">Webhooks (Optional)</h3>
          <p className="mt-1 text-sm text-label-muted">
            Add a <code>webhook</code> object to receive notifications when the run completes.
          </p>
          <div className="mt-2">
            <JsonBox>{`{
  "webhook": {
    "url": "https://your-server.com/webhook",
    "events": ["run.completed", "run.failed"]
  }
}`}</JsonBox>
          </div>
        </section>
      </div>
    </div>
  );
}
