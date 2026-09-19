# Contributing to Idea Evaluator

Thank you for helping improve Idea Evaluator. Contributions are welcome when they make the
evaluation workflow safer, clearer, more reliable, or easier to run.

This guide follows the structure of the [Angular contribution guide](https://github.com/angular/angular/blob/main/CONTRIBUTING.md), adapted for this repository's Python bridge and React UI.

## Code of conduct

Be respectful, specific, and constructive. Do not include private user ideas, API keys, provider
responses, credentials, or other sensitive information in issues, commits, or pull requests.

## Questions and support

Use the repository's issue tracker for reproducible bugs, documentation problems, and feature
proposals. For general questions, first check `README.md`, `INSTRUCTIONS.md`, and the existing
issues before opening a new one.

## Reporting a bug

Before opening an issue:

1. Search existing open and closed issues.
2. Confirm the problem against the latest `main` branch when possible.
3. Reduce the problem to the smallest reproducible example.
4. Remove API keys, private ideas, user data, and provider output from logs and screenshots.

A useful bug report includes:

- what you expected to happen;
- what actually happened;
- the steps and commands needed to reproduce it;
- the operating system, Python version, and Node.js version;
- whether the issue affects the bridge, CLI, UI, Docker, or Vercel deployment; and
- relevant sanitized logs or screenshots.

## Proposing a feature

For substantial features, open an issue before implementing them. Describe the user problem,
proposed behavior, alternatives considered, and any changes needed to the contracts, bridge API,
UI, persistence, or deployment model. Small, well-scoped improvements may go directly into a pull
request.

## Development setup

Requirements:

- Python 3.11 or newer
- Node.js 20 or newer
- Docker Desktop for container testing

From the repository root:

```bash
cp .env.example .env
python3 bridge/server.py
```

In a second terminal:

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

## Making changes

1. Create a focused branch from `main`:

   ```bash
   git switch -c fix/short-description
   ```

2. Keep each change focused and avoid unrelated formatting churn.
3. Preserve the consent, approval, evidence-status, and observability boundaries in the evaluator.
4. Update contracts, documentation, and tests when behavior changes.
5. Never commit `.env` files, API keys, SQLite databases, run history, dependencies, or build output.

## Testing and validation

Run the checks relevant to your change before opening a pull request:

```bash
python3 -m pytest
cd web && npm run build
```

For Docker-related changes:

```bash
docker build -t idea-evaluator:latest .
```

If a check cannot be run locally, state why in the pull request. New Python behavior should include
tests where practical; UI changes should include a screenshot or short recording when visual
behavior is affected.

## Pull requests

Before opening a pull request:

1. Search for related issues and pull requests to avoid duplicate work.
2. Rebase or update your branch from `main` if needed.
3. Review the complete diff and confirm that no secrets or generated files are included.
4. Run the applicable tests and builds.
5. Use a clear title and description explaining the problem, solution, scope, and validation.

Pull requests should include:

- a concise summary of the user-facing or developer-facing change;
- links to related issues, if any;
- test and build commands that were run;
- screenshots or recording for visible UI changes; and
- any required environment-variable, migration, or deployment changes.

Maintainers may request changes when a proposal is too broad, lacks tests, exposes sensitive data,
or changes a public contract without documenting the impact.

## Coding conventions

- Keep Python modules small and typed where practical.
- Use the existing contract models and provider abstractions instead of passing unstructured data.
- Keep bridge endpoints explicit and validate visitor-supplied input.
- Keep React changes accessible, responsive, and consistent with the existing UI.
- Prefer clear names and small functions over clever abstractions.
- Document new public behavior and configuration.

## Commit messages

Use a short, imperative subject line. Conventional Commit prefixes are encouraged:

```text
feat(ui): add provider status indicator
fix(bridge): validate empty descriptions
docs: clarify local setup
test(pipeline): cover approval boundary
```

Keep commits focused so they are easy to review and revert.

## Security issues

Do not report undisclosed vulnerabilities, leaked credentials, or private data in a public issue.
Contact the repository owner privately with reproduction details and the minimum necessary evidence.
