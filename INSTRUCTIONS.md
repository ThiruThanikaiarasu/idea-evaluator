# Run Idea Evaluator locally

This download contains the source code only. It does **not** include saved ideas, SQLite data, run history, API keys, or authenticated CLI sessions.

## Option 1 — Docker (recommended)

Install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/), then run these commands from this folder:

```bash
docker build -t idea-evaluator:latest .
docker run --rm -p 8787:8787 \
  -v idea-evaluator-data:/app/data \
  -v idea-evaluator-runs:/app/runs \
  idea-evaluator:latest
```

Open `http://localhost:8787`.

The Docker version supports **OpenAI API**, **Claude API**, and **Groq API**. In Run Settings, choose a provider, paste an API key, and run the evaluation. Your key is used for that request only; it is not written to the database, run files, or image.

## Option 2 — Run the UI and bridge manually

Requirements: Python 3.11+ and Node.js 20+.

In terminal one:

```bash
python3 bridge/server.py
```

In terminal two:

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`.

## Option 3 — Use a local coding CLI

Manual mode can also use a CLI already authenticated on your machine:

- Install and sign in to Codex CLI, then choose **Local Codex CLI** in Run Settings.
- Or install and sign in to Claude CLI, then choose **Local Claude CLI**.
- Or install and sign in to [Antigravity CLI](https://www.antigravity.google/docs/cli/getting-started/), then choose **Antigravity CLI**. Its official executable is `agy`.

The bridge must be running before either option works. CLI execution is intentionally local-only; do not expose it publicly.

## Troubleshooting

- **“Start the local bridge first”**: run `python3 bridge/server.py` from the project root.
- **Port already in use**: stop the process using port `5173` or `8787`, then restart.
- **Docker cannot connect**: open Docker Desktop and wait for it to finish starting.
- **API key rejected**: verify that the selected provider matches the key and that the account has API access.
