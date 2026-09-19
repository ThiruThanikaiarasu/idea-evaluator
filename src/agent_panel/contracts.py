from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import StrEnum
from typing import Any


class EvidenceStatus(StrEnum):
    HYPOTHESIS = "hypothesis"
    VERIFIED = "verified"


class Decision(StrEnum):
    PROCEED = "proceed"
    NARROW = "narrow"
    PIVOT = "pivot"
    STOP = "stop"


@dataclass(frozen=True)
class Idea:
    title: str
    description: str
    consent_to_project: bool


@dataclass(frozen=True)
class Triage:
    title: str
    concern: str
    promising_angle: str
    verdict: Decision


@dataclass(frozen=True)
class Claim:
    statement: str
    evidence_status: EvidenceStatus
    source: str | None = None


@dataclass(frozen=True)
class Review:
    persona: str
    verdict: Decision
    top_risks: list[str]
    assumptions_to_test: list[str]
    smallest_testable_version: str
    claims: list[Claim]


@dataclass(frozen=True)
class Diagnosis:
    decision: Decision
    consensus_risks: list[str]
    disagreement_or_uncertainty: str
    evidence_gaps: list[str]
    first_problem_to_solve: str


@dataclass(frozen=True)
class MentorPlan:
    mvp: str
    two_weekend_plan: list[str]
    do_not_build: list[str]
    user_validation: str
    success_metric: str


@dataclass
class RunResult:
    idea: Idea
    triage: list[Triage]
    reviews: list[Review]
    diagnosis: Diagnosis
    mentor_plan: MentorPlan
    failures: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)
