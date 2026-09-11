# Deploy the hosted UI on Vercel

This configuration deploys the React user interface to Vercel. The Python bridge and SQLite database are intentionally **not** deployed as Vercel Functions: the current bridge is a persistent local/Docker service, while Vercel Functions have ephemeral filesystems. Local coding CLIs also require the user's own machine.

## 1. Host the bridge as a Docker service

Deploy the project's Docker image to a container host with a persistent disk or volume, such as Railway, Fly.io, Render, Cloud Run, or a VM.

Set these environment variables on that host:

```text
IDEA_EVALUATOR_HOST=0.0.0.0
IDEA_EVALUATOR_PORT=8787
```

Attach persistent storage to `/app/data` and `/app/runs`. This preserves ideas, agent reviews, mentor results, iteration history, and artifact links.

The hosted bridge should expose HTTPS. Do not install or expose local coding CLIs on this public service; use API provider modes there.

## 2. Deploy this repository to Vercel

1. Import `ThiruThanikaiarasu/idea-evaluator` in Vercel.
2. Vercel will use `vercel.json` to install and build the React app from `web/`.
3. In **Project Settings → Environment Variables**, add the following for Production and Preview as appropriate:

```text
VITE_DEPLOYMENT_TARGET=vercel
VITE_API_BASE=https://YOUR-BRIDGE-DOMAIN
```

`VITE_API_BASE` must be the public HTTPS URL of the bridge VM and must not end with `/`.

4. Deploy.

## Hosted behavior

- The Vercel UI shows OpenAI, Claude, Groq, and TensorMux API modes only.
- A visitor-provided API key is passed to the bridge only for the active request; the bridge does not store it in SQLite or run history.
- Codex CLI, Claude CLI, and Antigravity CLI are hidden in the hosted UI. The Settings screen directs users to download the local evaluator for those modes.

## Before sharing publicly

The bridge sends `Access-Control-Allow-Origin: *`, so the Vercel URL can call it without an origin allowlist. Protect the bridge with authentication and rate limiting at the container host or reverse proxy. A public anonymous endpoint that accepts user API keys should use HTTPS and should not log request bodies.
