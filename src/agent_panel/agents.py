from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from typing import Protocol

from .contracts import Claim, Decision, Diagnosis, EvidenceStatus, Idea, MentorPlan, Review, Triage
from .providers import JsonProvider


class AgentPlugin(Protocol):
    """The extension boundary for all framework agents."""

    name: str


@dataclass(frozen=True)
class EvaluationContext:
    idea: Idea


@dataclass(frozen=True)
class InitialAssessmentPlugin:
    provider: JsonProvider
    name: str = "initial_assessment"

    def run(self, context: EvaluationContext) -> Triage:
        raw = self.provider.complete(
            system="INITIAL_ASSESSMENT: You are a respectful product critic. Return JSON only. Give one concern, one promising angle, and verdict: narrow, proceed, pivot, or stop. Do not mock people.",
            prompt=json.dumps(asdict(context.idea)),
        )
        return Triage(context.idea.title, raw["concern"], raw["promising_angle"], Decision(raw["verdict"].lower()))


@dataclass(frozen=True)
class PerspectivePlugin:
    provider: JsonProvider
    name: str
    responsibility: str

    def run(self, context: EvaluationContext) -> Review:
        raw = self.provider.complete(
            system=(f"You are the {self.name}. {self.responsibility} Return JSON only with verdict, top_risks (max 3), "
                    "assumptions_to_test (max 3), smallest_testable_version, and claims. Every claim must state evidence_status "
                    "as hypothesis unless a source is supplied. You advise; you do not make the final decision."),
            prompt=json.dumps(asdict(context.idea)),
        )
        claims = [Claim(item["statement"], EvidenceStatus(item.get("evidence_status", "hypothesis")), item.get("source")) for item in raw["claims"]]
        return Review(self.name, Decision(raw["verdict"].lower()), raw["top_risks"], raw["assumptions_to_test"], raw["smallest_testable_version"], claims)


@dataclass(frozen=True)
class CoordinatorPlugin:
    provider: JsonProvider
    name: str = "coordinator"

    def run(self, context: EvaluationContext, reviews: list[Review]) -> Diagnosis:
        raw = self.provider.complete(
            system="COORDINATOR: Compare specialist reviews. Return JSON only. Do not invent evidence. State a decision: proceed, narrow, pivot, or stop; consensus_risks; disagreement_or_uncertainty; evidence_gaps; first_problem_to_solve.",
            prompt=json.dumps({"idea": asdict(context.idea), "reviews": [asdict(review) for review in reviews]}),
        )
        return Diagnosis(Decision(raw["decision"].lower()), raw["consensus_risks"], raw["disagreement_or_uncertainty"], raw["evidence_gaps"], raw["first_problem_to_solve"])


@dataclass(frozen=True)
class MentorPlugin:
    provider: JsonProvider
    name: str = "mentor"

    def run(self, context: EvaluationContext, diagnosis: Diagnosis, reviews: list[Review]) -> MentorPlan:
        raw = self.provider.complete(
            system="MENTOR: Turn an approved diagnosis into a disciplined plan. Return JSON only: mvp, two_weekend_plan, do_not_build, user_validation, success_metric. Do not promise a startup; propose a small test with non-friend users.",
            prompt=json.dumps({"idea": asdict(context.idea), "diagnosis": asdict(diagnosis), "reviews": [asdict(review) for review in reviews]}),
        )
        return MentorPlan(raw["mvp"], raw["two_weekend_plan"], raw["do_not_build"], raw["user_validation"], raw["success_metric"])


def default_reviewers(provider: JsonProvider) -> list[PerspectivePlugin]:
    return [
        PerspectivePlugin(provider, "Skeptical CTO", "Assess feasibility, hidden dependencies, operational risks, and whether this is a feature rather than a product."),
        PerspectivePlugin(provider, "Bored user", "Assess whether a real person has a repeated pain, a reason to return, and a faster first-use experience."),
        PerspectivePlugin(provider, "Competitor", "Identify alternative behaviours, differentiation hypotheses, and claims that require real competitor research. Never invent facts."),
        PerspectivePlugin(provider, "Honest friend", "Challenge scope, motivation, likelihood of finishing, and what can be removed immediately."),
    ]
