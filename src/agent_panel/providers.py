from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from abc import ABC, abstractmethod
from typing import Any


class ProviderError(RuntimeError):
    pass


class JsonProvider(ABC):
    @abstractmethod
    def complete(self, *, system: str, prompt: str) -> dict[str, Any]:
        """Return one JSON object following the caller's stated contract."""


class GroqProvider(JsonProvider):
    """Minimal OpenAI-compatible provider; no SDK required for workshop setup."""

    def __init__(self, model: str = "llama-3.3-70b-versatile", timeout_seconds: int = 25):
        key = os.environ.get("GROQ_API_KEY")
        if not key:
            raise ProviderError("GROQ_API_KEY is required when --provider groq is used")
        self.key = key
        self.model = model
        self.timeout_seconds = timeout_seconds

    def complete(self, *, system: str, prompt: str) -> dict[str, Any]:
        payload = {
            "model": self.model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        }
        request = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode(),
            headers={"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                body = json.loads(response.read().decode())
            return json.loads(body["choices"][0]["message"]["content"])
        except (urllib.error.URLError, KeyError, IndexError, json.JSONDecodeError) as error:
            raise ProviderError(f"Provider call failed: {error}") from error


class MockProvider(JsonProvider):
    """Predictable, offline output for rehearsal and automated tests."""

    def complete(self, *, system: str, prompt: str) -> dict[str, Any]:
        persona = next((name for name in ("Skeptical CTO", "Bored user", "Competitor", "Honest friend") if name in system), "")
        if "TRIAGE" in system or "INITIAL_ASSESSMENT" in system:
            return {"concern": "The first version is broader than one student team can validate.", "promising_angle": "Start with one campus group and one repeated pain.", "verdict": "narrow"}
        if persona:
            risks = {
                "Skeptical CTO": ["External integrations may block a first version.", "A full platform is unnecessary for validation."],
                "Bored user": ["The reason to return is not yet clear.", "The first interaction must be faster than the current workaround."],
                "Competitor": ["Existing alternatives may already satisfy the basic need.", "Differentiation is still a hypothesis."],
                "Honest friend": ["The scope can easily exceed two weekends.", "The team needs a real user commitment."],
            }[persona]
            return {"verdict": "narrow", "top_risks": risks, "assumptions_to_test": ["At least five target users describe this as a weekly pain."], "smallest_testable_version": "A manual campus-only pilot with ten users.", "claims": [{"statement": "Existing alternatives may exist; verify before presenting.", "evidence_status": "hypothesis", "source": None}]}
        if "COORDINATOR" in system:
            return {"decision": "narrow", "consensus_risks": ["Scope is too broad.", "Need evidence that users will return."], "disagreement_or_uncertainty": "Competitor landscape has not been verified.", "evidence_gaps": ["Interview five non-friend target users.", "Check alternatives with sources."], "first_problem_to_solve": "Validate one repeated campus pain with one narrow user group."}
        return {"mvp": "A manual pilot for one campus group and one repeated task.", "two_weekend_plan": ["Interview five target users.", "Prototype one core flow.", "Test it with three non-friend users."], "do_not_build": ["Mobile app", "Payments", "Recommendations"], "user_validation": "Ask each tester whether they would use it again next week and why.", "success_metric": "Three non-friend users complete the core flow and at least one returns."}
