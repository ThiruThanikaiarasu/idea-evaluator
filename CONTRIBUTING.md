# Contributing to Idea Evaluator

Thanks for your interest in contributing. Idea Evaluator is a small application containing three
cooperating parts:

- `web` — the React/Vite interface for submitting ideas and reviewing evaluations.
- `bridge` — the Python HTTP bridge, persistence layer, and provider integrations used by the UI.
- `src/agent_panel` — the reusable evaluation pipeline and command-line interface.

Please read the root [README](README.md) and [INSTRUCTIONS](INSTRUCTIONS.md) before making
changes. They describe the supported local, Docker, and hosted deployment workflows.

## Code of conduct

Be respectful, assume good intent, and keep discussions focused on improving the project. Do not
share API keys, private ideas, provider responses, personal data, credentials, or other sensitive
information in issues, pull requests, logs, screenshots, or test fixtures.

## Before you start

For a new checkout:

```bash
git clone <repository-url> idea-evaluator
cd idea-evaluator
cp .env.example .env
```

Requirements:

- Python 3.11 or newer
- Node.js 20 or newer
- Docker Desktop, if testing the container workflow

Install the web dependencies from the repository root:

```bash
cd web
npm install
```

The `data/` and `runs/` directories contain local runtime state and are intentionally ignored by
Git. Never commit them or any file containing credentials.

## Development workflow

Start the bridge from the repository root:

```bash
python3 bridge/server.py
```

In a second terminal, start the web interface:

```bash
cd web
cp .env.example .env
npm run dev
```

The UI is available at <http://localhost:5173>. The bridge listens on
<http://127.0.0.1:8787> by default.

For the offline Python CLI workflow:

```bash
python3 -m src.agent_panel.cli \
  --title "Example idea" \
  --description "A synthetic example for local testing." \
  --consent-to-project --approve --provider mock
```

For Docker-related work:

```bash
docker build -t idea-evaluator:latest .
docker run --rm -p 8787:8787 \
  -v idea-evaluator-data:/app/data \
  -v idea-evaluator-runs:/app/runs \
  idea-evaluator:latest
```

## Checks before opening a pull request

Run the checks relevant to your change. For a complete change, run all of them:

```bash
python3 -m pytest
cd web && npm run build
```

If you change the bridge, verify that it starts and that the affected endpoint works with synthetic
input. If you change the UI, verify the relevant flow in the browser at `http://localhost:5173`.
If you change Docker or deployment configuration, run the relevant Docker or Vercel validation.

If a check cannot be run locally, explain why in the pull request.

## Safety requirements

These rules are part of the product contract:

- Preserve explicit consent before an idea is projected, saved, or analyzed.
- Preserve the human approval checkpoint before mentor planning or other downstream actions.
- Keep evidence labels honest; do not present hypotheses or unverified competitor claims as facts.
- Do not add automatic external actions, publishing, messaging, or outreach without an explicit user
  approval step.
- Do not commit API keys, `.env` files, SQLite databases, run history, personal ideas, or provider
  responses.
- Keep credentials out of source code, screenshots, logs, fixtures, and error messages.
- Validate visitor-supplied input and preserve the bridge's local-only safeguards for coding CLIs.

## Issues and feature requests

Search existing issues before opening a new one. A useful bug report includes:

1. The affected component (`web`, `bridge`, `src/agent_panel`, Docker, or deployment).
2. The operating system, Python version, Node.js version, and relevant setup details.
3. Exact reproduction steps using synthetic or redacted data.
4. Expected behavior and actual behavior.
5. Relevant console output or screenshots with secrets and private content removed.

For a major feature or behavior change, open an issue first and describe the proposed design. This
helps keep the Python contracts, bridge API, UI, persistence model, and deployment paths compatible.

## Pull requests

Before opening a pull request:

1. Create a focused branch from the latest default branch.
2. Keep the change scoped and update the relevant documentation.
3. Add or update tests and run the checks above.
4. Confirm that no ignored or personal files are included:

   ```bash
   git status --short
   git diff --check
   git diff --stat
   ```

5. Explain the problem, solution, affected components, and verification in the pull request.
6. Call out any contract, persistence, API-provider, environment-variable, or deployment impact.

Pull requests that weaken consent or approval boundaries, expose credentials, misrepresent evidence,
or rely on private data will not be accepted.

## Commit messages

Use a short imperative subject with a conventional type and, when useful, a component scope:

```text
feat(web): add evaluation progress state
fix(bridge): reject empty idea descriptions
docs(repo): clarify local setup
test(pipeline): cover approval boundary
```

Keep commits small and logically grouped. Avoid mixing formatting-only changes with behavior changes.

## License

By contributing, you agree that your contribution may be distributed under the repository's license.
