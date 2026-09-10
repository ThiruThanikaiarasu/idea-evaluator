# Agent Panel — extensible agentic evaluation framework

This is a reusable agentic system. Give it one consented idea at runtime and it evaluates that idea through configurable specialist-agent plugins. It is deliberately a workflow, not a collection of unrelated prompts:

```text
runtime idea → initial assessment → parallel specialist reviews
→ coordinator → human checkpoint → mentor → shareable report
```

## What it demonstrates

- typed input/output contracts at every stage;
- pluggable specialist reviewers running concurrently;
- a coordinator that distinguishes agreement, uncertainty, and evidence gaps;
- an explicit, non-optional human checkpoint before planning;
- consent checks before an idea can be shown or analysed;
- run logs and a saved report for review; and
- a deterministic mock provider for rehearsals when Wi-Fi or an API is unavailable.

It is designed to teach a principle: agents can recommend, but people own decisions.

## Evaluate an idea offline (no API key)

From this directory:

```bash
python3 -m src.agent_panel.cli \
  --title "Idea title" \
  --description "Problem, target user, and proposed solution." \
  --consent-to-project --approve --provider mock
```

The report and JSONL event log are written under `runs/`.

## Run with Groq

The project uses Groq's OpenAI-compatible chat-completions endpoint without adding a package dependency:

```bash
export GROQ_API_KEY='...'
python3 -m src.agent_panel.cli \
  --title "Your idea title" \
  --description "A concise description of the problem and proposed solution." \
  --consent-to-project --approve --provider groq
```

On a real session day, collect consent before projecting an idea. Do not present agent-generated competitor claims as facts unless citations have been checked.

## Production choices intentionally visible in the code

1. **Contracts** — each stage consumes and returns typed data, rather than prose alone.
2. **Plugins** — `AgentPlugin` is the extension point. Add a reviewer without changing orchestration.
3. **Boundaries** — reviewers cannot call tools or make decisions; only the coordinator synthesises.
4. **Concurrency** — reviewers fan out with a bounded thread pool and each failure is retained.
5. **Evidence status** — every claim is marked `hypothesis` or `verified`; this starter defaults to hypothesis.
6. **Human approval** — mentor planning cannot run without an explicit approval flag.
7. **Observability** — all stage starts, completions, failures, and decisions are persisted.

## Before presenting

- Rehearse with `--provider mock` and a recorded screen capture.
- Rehearse once with the actual provider and a hotspot.
- Set a small timeout and retain the report from a successful run as a fallback.
- Let your submission UI collect ideas; pass the selected, consented idea to this framework.

## Docker hosting

The interactive evaluator can be deployed as one container. See the Docker section in
[`bridge/README.md`](bridge/README.md) for the build/run commands, persistent volumes, and the
security model for visitor-supplied OpenAI, Claude, or Groq API keys.
