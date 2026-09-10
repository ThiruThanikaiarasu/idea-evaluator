from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict
from pathlib import Path

from .agents import CoordinatorPlugin, EvaluationContext, InitialAssessmentPlugin, MentorPlugin, PerspectivePlugin, default_reviewers
from .contracts import Diagnosis, Idea, MentorPlan, Review, RunResult, Triage
from .observability import RunLogger
from .providers import JsonProvider


class PanelPipeline:
    def __init__(self, provider: JsonProvider, run_dir: Path, reviewers: list[PerspectivePlugin] | None = None):
        self.provider = provider
        self.logger = RunLogger(run_dir)
        self.initial_assessment = InitialAssessmentPlugin(provider)
        self.reviewers = reviewers or default_reviewers(provider)
        self.coordinator_agent = CoordinatorPlugin(provider)
        self.mentor_agent = MentorPlugin(provider)

    @staticmethod
    def validate_idea(idea: Idea) -> None:
        if not idea.consent_to_project:
            raise ValueError(f"'{idea.title}' cannot be used without consent to project it.")
        if not idea.title.strip() or not idea.description.strip():
            raise ValueError("The idea needs a title and description.")
        if len(idea.description) > 600:
            raise ValueError(f"'{idea.title}' is over the 600-character intake limit.")

    def assess(self, context: EvaluationContext) -> Triage:
        self.logger.event("initial_assessment", "started", idea=context.idea)
        result = self.initial_assessment.run(context)
        self.logger.event("initial_assessment", "completed", result=result)
        return result

    def reviews(self, context: EvaluationContext) -> tuple[list[Review], list[str]]:
        results, failures = [], []
        self.logger.event("parallel_reviews", "started", plugin_count=len(self.reviewers))
        with ThreadPoolExecutor(max_workers=len(self.reviewers)) as executor:
            futures = {executor.submit(plugin.run, context): plugin.name for plugin in self.reviewers}
            for future in as_completed(futures):
                persona = futures[future]
                try:
                    result = future.result()
                    results.append(result)
                    self.logger.event("parallel_reviews", "completed", result=result)
                except Exception as error:  # continue the presentation when one worker fails
                    failure = f"{persona}: {error}"
                    failures.append(failure)
                    self.logger.event("parallel_reviews", "failed", failure=failure)
        if not results:
            raise RuntimeError("All reviewer agents failed; use the recorded rehearsal report.")
        return sorted(results, key=lambda review: review.persona), failures

    def coordinate(self, context: EvaluationContext, reviews: list[Review]) -> Diagnosis:
        self.logger.event("coordinator", "started")
        result = self.coordinator_agent.run(context, reviews)
        self.logger.event("coordinator", "completed", result=result)
        return result

    def mentor(self, context: EvaluationContext, diagnosis: Diagnosis, reviews: list[Review], human_approved: bool) -> MentorPlan:
        if not human_approved:
            self.logger.event("human_checkpoint", "rejected")
            raise PermissionError("Human approval is required before the mentor stage.")
        self.logger.event("human_checkpoint", "approved")
        result = self.mentor_agent.run(context, diagnosis, reviews)
        self.logger.event("mentor", "completed", result=result)
        return result

    def run(self, idea: Idea, human_approved: bool) -> RunResult:
        self.validate_idea(idea)
        context = EvaluationContext(idea)
        assessment = self.assess(context)
        reviews, failures = self.reviews(context)
        diagnosis = self.coordinate(context, reviews)
        plan = self.mentor(context, diagnosis, reviews, human_approved)
        return RunResult(idea, [assessment], reviews, diagnosis, plan, failures)


def save_report(result: RunResult, run_dir: Path) -> Path:
    path = run_dir / "report.md"
    lines = [f"# {result.idea.title}: product decision report", "", f"> {result.idea.description}", "", "## Coordinator decision", f"**{result.diagnosis.decision.value.upper()}** — {result.diagnosis.first_problem_to_solve}", "", "## Consensus risks"]
    lines += [f"- {risk}" for risk in result.diagnosis.consensus_risks]
    lines += ["", "## Evidence still needed"] + [f"- {gap}" for gap in result.diagnosis.evidence_gaps]
    lines += ["", "## Two-weekend MVP", result.mentor_plan.mvp, "", "## Plan"] + [f"- {step}" for step in result.mentor_plan.two_weekend_plan]
    lines += ["", "## Do not build"] + [f"- {item}" for item in result.mentor_plan.do_not_build]
    lines += ["", "## Real-world test", result.mentor_plan.user_validation, "", f"**Success metric:** {result.mentor_plan.success_metric}", "", "---", "This is not a startup. It is a better next action. Validate it with people outside the room."]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    (run_dir / "result.json").write_text(json.dumps(result.as_dict(), indent=2) + "\n", encoding="utf-8")
    return path
