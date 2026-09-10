# Local CLI bridge

This process is the only component allowed to invoke a local coding CLI. It listens only on
`127.0.0.1:8787`; the React UI at port 5173 calls it over HTTP.

## Start it

```sh
cd /Users/thiru/MySpace/projects/agentic-idea-evaluation-framework
python3 bridge/server.py
```

Keep that terminal open, then start the UI in another terminal:

```sh
cd /Users/thiru/MySpace/projects/agentic-idea-evaluation-framework/web
npm run dev
```

Choose **Local Codex CLI** or **Local Claude CLI** in the UI settings, then use
**Check configuration**. Each evaluation starts four isolated reviewer calls followed by a
coordinator call. Final structured results are saved under `runs/`; no credentials are written
there.

The local development server accepts requests only from the local Vite origins. Do not expose the
local CLI mode to a LAN: it can execute whichever authenticated CLI the user selects.

## Run as a hosted Docker service

The Docker image serves the built React UI and bridge from the same origin on port `8787`. It is
designed for API providers; Local Codex CLI and Local Claude CLI are intentionally not installed in
the image.

```sh
cd /Users/thiru/MySpace/projects/agentic-idea-evaluation-framework
docker build -t idea-evaluator .
docker run --rm -p 8787:8787 \
  -v idea-evaluator-data:/app/data \
  -v idea-evaluator-runs:/app/runs \
  idea-evaluator
```

Open `http://localhost:8787`, choose OpenAI, Claude, or Groq API in **Run settings**, paste an API
key, and run an evaluation. The browser sends the key only with that request; the bridge uses it to
call the selected provider and does not save it in SQLite, run JSON, logs, or the Docker image.

For a public deployment, put the container behind HTTPS and add authentication/rate limiting at the
proxy or hosting layer. A public anonymous endpoint that accepts visitors' API keys should not be
exposed without those controls.
