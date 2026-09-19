# Idea Evaluator — setup and release instructions

This repository contains the complete Idea Evaluator application:

- `web/` — React/Vite user interface
- `bridge/` — Python HTTP bridge used by the UI
- `src/agent_panel/` — reusable Python evaluation pipeline and CLI
- `tests/` — automated tests

## Local setup

Requirements: Python 3.11+ and Node.js 20+.

1. Copy `.env.example` to `.env` and fill in any provider keys you need. Never commit `.env`.
2. Start the bridge from the repository root:

   ```bash
   python3 bridge/server.py
   ```

3. In a second terminal, start the UI:

   ```bash
   cd web
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173`.

The bridge stores local SQLite data in `data/` and run snapshots in `runs/`. These directories are
ignored by Git.

## Tests and build

```bash
python3 -m pytest
cd web && npm run build
```

## Docker

```bash
docker build -t idea-evaluator:latest .
docker run --rm -p 8787:8787 \
  -v idea-evaluator-data:/app/data \
  -v idea-evaluator-runs:/app/runs \
  idea-evaluator:latest
```

Then open `http://localhost:8787`.

## Git checklist

Before pushing, confirm that `.env`, API keys, `data/`, `runs/`, `web/node_modules/`, and
`web/dist/` are not tracked:

```bash
git status --short
git init
git add .
git commit -m "Initial Idea Evaluator app"
```

Add the remote and push using the repository URL supplied by your Git host.
