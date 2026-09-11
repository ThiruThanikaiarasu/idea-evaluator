# Idea Evaluator bridge

This package is the backend bridge only. It deliberately does **not** include the React UI,
saved ideas, run history, or API keys. Run it on your own machine or a VM, then point a hosted
Idea Evaluator UI at its HTTPS URL.

## Run on a VM

The bridge uses only Python's standard library. Install Python 3.11 or later, copy this `bridge/`
directory to the VM, and run it from the directory that contains `bridge/`:

```sh
IDEA_EVALUATOR_HOST=0.0.0.0 IDEA_EVALUATOR_PORT=8787 python3 bridge/server.py
```

The bridge is then available at `http://YOUR-VM:8787`. Put it behind an HTTPS reverse proxy before
using it from a public hosted UI.

## Connect a Vercel UI

In the Vercel project that hosts the React UI, set these build environment variables and redeploy:

```text
VITE_DEPLOYMENT_TARGET=vercel
VITE_API_BASE=https://YOUR-BRIDGE-DOMAIN
```

`VITE_API_BASE` is the public VM URL, without a trailing slash.

## CORS and security

The bridge returns `Access-Control-Allow-Origin: *`, allowing the hosted UI to call the bridge from
any origin. This makes deployment simple, but the VM must still use HTTPS and should be protected
with authentication, rate limiting, and request-body-safe logs.

## Local CLIs and data

For local CLI mode, install and authenticate Codex CLI, Claude CLI, or Antigravity CLI on the same
machine as the bridge. For a hosted bridge, use OpenAI, Claude, Groq, or TensorMux API mode
instead; do not install local coding CLIs on a public server.

SQLite data is created in `data/` and run snapshots are written to `runs/`, next to `bridge/`.
Attach persistent storage for both directories on a VM or container.
