from __future__ import annotations

import argparse
from datetime import UTC, datetime
from pathlib import Path

from .contracts import Idea
from .pipeline import PanelPipeline, save_report
from .providers import GroqProvider, MockProvider


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the multi-agent workshop panel.")
    parser.add_argument("--title", required=True, help="Title of the one idea being evaluated.")
    parser.add_argument("--description", required=True, help="Concise problem and proposed solution.")
    parser.add_argument("--consent-to-project", action="store_true", help="Required before the idea can be shown or analysed.")
    parser.add_argument("--provider", choices=("mock", "groq"), default="mock")
    parser.add_argument("--approve", action="store_true", help="Record the required human approval before mentor planning.")
    parser.add_argument("--runs-dir", type=Path, default=Path("runs"))
    args = parser.parse_args()
    idea = Idea(args.title, args.description, args.consent_to_project)
    provider = MockProvider() if args.provider == "mock" else GroqProvider()
    run_dir = args.runs_dir / datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    result = PanelPipeline(provider, run_dir).run(idea, args.approve)
    report = save_report(result, run_dir)
    print(f"Completed: {report}")
    if result.failures:
        print("Partial failures (the pipeline continued):")
        print("\n".join(f"- {failure}" for failure in result.failures))


if __name__ == "__main__":
    main()
