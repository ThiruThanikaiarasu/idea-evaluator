"""SQLite persistence for the local idea evaluator bridge."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

DATABASE = Path(__file__).resolve().parent.parent / "data" / "idea-evaluator.sqlite3"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def connection() -> sqlite3.Connection:
    DATABASE.parent.mkdir(exist_ok=True)
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def initialize() -> None:
    with connection() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS ideas (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS evaluations (
                id TEXT PRIMARY KEY,
                idea_id TEXT NOT NULL REFERENCES ideas(id),
                iteration INTEGER NOT NULL,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                created_at TEXT NOT NULL,
                payload_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS evaluations_idea_created
                ON evaluations (idea_id, created_at DESC);
            CREATE TABLE IF NOT EXISTS mentor_revisions (
                id TEXT PRIMARY KEY,
                idea_id TEXT NOT NULL REFERENCES ideas(id),
                source_evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
                selected_feedback_json TEXT NOT NULL,
                custom_instruction TEXT NOT NULL,
                revision_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS approvals (
                id TEXT PRIMARY KEY,
                idea_id TEXT NOT NULL REFERENCES ideas(id),
                evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
                decision TEXT NOT NULL,
                notes TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS artifacts (
                id TEXT PRIMARY KEY,
                idea_id TEXT NOT NULL REFERENCES ideas(id),
                approval_id TEXT REFERENCES approvals(id),
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                metadata_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


def list_ideas() -> list[dict[str, str]]:
    with connection() as db:
        rows = db.execute(
            """
            SELECT ideas.id, ideas.title, ideas.description, ideas.created_at AS createdAt, ideas.updated_at AS updatedAt,
                   COUNT(DISTINCT evaluations.id) AS iterationCount,
                   COUNT(DISTINCT mentor_revisions.id) AS mentorRevisionCount,
                   COUNT(DISTINCT approvals.id) AS approvalCount,
                   COUNT(DISTINCT artifacts.id) AS artifactCount
            FROM ideas
            LEFT JOIN evaluations ON evaluations.idea_id = ideas.id
            LEFT JOIN mentor_revisions ON mentor_revisions.idea_id = ideas.id
            LEFT JOIN approvals ON approvals.idea_id = ideas.id
            LEFT JOIN artifacts ON artifacts.idea_id = ideas.id
            GROUP BY ideas.id
            ORDER BY ideas.updated_at DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def create_idea(title: str, description: str) -> dict[str, str]:
    idea = {"id": str(uuid4()), "title": title.strip(), "description": description.strip()}
    timestamp = now()
    with connection() as db:
        db.execute(
            "INSERT INTO ideas (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (idea["id"], idea["title"], idea["description"], timestamp, timestamp),
        )
    return idea


def save_evaluation(record: dict[str, Any]) -> None:
    with connection() as db:
        existing = db.execute("SELECT id FROM ideas WHERE id = ?", (record["ideaId"],)).fetchone()
        if not existing:
            raise ValueError("The selected idea no longer exists.")
        iteration = db.execute(
            "SELECT COALESCE(MAX(iteration), 0) + 1 FROM evaluations WHERE idea_id = ?",
            (record["ideaId"],),
        ).fetchone()[0]
        record["iteration"] = iteration
        db.execute(
            "INSERT INTO evaluations (id, idea_id, iteration, provider, model, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (record["runId"], record["ideaId"], iteration, record["provider"], record["model"], record["createdAt"], json.dumps(record)),
        )
        db.execute("UPDATE ideas SET updated_at = ? WHERE id = ?", (record["createdAt"], record["ideaId"]))


def update_evaluation(record: dict[str, Any]) -> None:
    with connection() as db:
        db.execute(
            "UPDATE evaluations SET payload_json = ? WHERE id = ? AND idea_id = ?",
            (json.dumps(record), record["runId"], record["ideaId"]),
        )


def list_evaluations(idea_id: str) -> list[dict[str, Any]]:
    with connection() as db:
        rows = db.execute(
            "SELECT payload_json FROM evaluations WHERE idea_id = ? ORDER BY iteration DESC", (idea_id,)
        ).fetchall()
    return [json.loads(row["payload_json"]) for row in rows]


def save_mentor_revision(
    idea_id: str, evaluation_id: str, selected_feedback: list[str], custom_instruction: str, revision: dict[str, Any]
) -> dict[str, Any]:
    item = {
        "id": str(uuid4()), "ideaId": idea_id, "sourceEvaluationId": evaluation_id,
        "selectedFeedback": selected_feedback, "customInstruction": custom_instruction,
        "revision": revision, "createdAt": now(),
    }
    with connection() as db:
        db.execute(
            "INSERT INTO mentor_revisions VALUES (?, ?, ?, ?, ?, ?, ?)",
            (item["id"], idea_id, evaluation_id, json.dumps(selected_feedback), custom_instruction, json.dumps(revision), item["createdAt"]),
        )
        db.execute("UPDATE ideas SET updated_at = ? WHERE id = ?", (item["createdAt"], idea_id))
    return item


def save_approval(idea_id: str, evaluation_id: str, decision: str, notes: str) -> dict[str, Any]:
    item = {"id": str(uuid4()), "ideaId": idea_id, "evaluationId": evaluation_id, "decision": decision, "notes": notes, "createdAt": now()}
    with connection() as db:
        db.execute(
            "INSERT INTO approvals VALUES (?, ?, ?, ?, ?, ?)",
            (item["id"], idea_id, evaluation_id, decision, notes, item["createdAt"]),
        )
        db.execute("UPDATE ideas SET updated_at = ? WHERE id = ?", (item["createdAt"], idea_id))
    return item


def save_artifact(idea_id: str, approval_id: str | None, title: str, url: str, metadata: dict[str, Any]) -> dict[str, Any]:
    item = {"id": str(uuid4()), "ideaId": idea_id, "approvalId": approval_id, "title": title, "url": url, "metadata": metadata, "createdAt": now()}
    with connection() as db:
        db.execute(
            "INSERT INTO artifacts VALUES (?, ?, ?, ?, ?, ?, ?)",
            (item["id"], idea_id, approval_id, title, url, json.dumps(metadata), item["createdAt"]),
        )
        db.execute("UPDATE ideas SET updated_at = ? WHERE id = ?", (item["createdAt"], idea_id))
    return item


def update_artifact(idea_id: str, artifact_id: str, title: str, url: str, metadata: dict[str, Any]) -> dict[str, Any]:
    with connection() as db:
        row = db.execute(
            "SELECT approval_id, created_at FROM artifacts WHERE id = ? AND idea_id = ?", (artifact_id, idea_id)
        ).fetchone()
        if not row:
            raise ValueError("The saved artifact was not found.")
        db.execute(
            "UPDATE artifacts SET title = ?, url = ?, metadata_json = ? WHERE id = ? AND idea_id = ?",
            (title, url, json.dumps(metadata), artifact_id, idea_id),
        )
        db.execute("UPDATE ideas SET updated_at = ? WHERE id = ?", (now(), idea_id))
    return {
        "id": artifact_id, "ideaId": idea_id, "approvalId": row["approval_id"], "title": title,
        "url": url, "metadata": metadata, "createdAt": row["created_at"],
    }


def idea_state(idea_id: str) -> dict[str, Any]:
    with connection() as db:
        idea = db.execute("SELECT id, title, description, created_at AS createdAt, updated_at AS updatedAt FROM ideas WHERE id = ?", (idea_id,)).fetchone()
        if not idea:
            raise ValueError("The selected idea no longer exists.")
        mentor_rows = db.execute("SELECT * FROM mentor_revisions WHERE idea_id = ? ORDER BY created_at", (idea_id,)).fetchall()
        approval_rows = db.execute("SELECT * FROM approvals WHERE idea_id = ? ORDER BY created_at", (idea_id,)).fetchall()
        artifact_rows = db.execute("SELECT * FROM artifacts WHERE idea_id = ? ORDER BY created_at", (idea_id,)).fetchall()
    return {
        "idea": dict(idea),
        "evaluations": list_evaluations(idea_id),
        "mentorRevisions": [
            {"id": row["id"], "ideaId": row["idea_id"], "sourceEvaluationId": row["source_evaluation_id"],
             "selectedFeedback": json.loads(row["selected_feedback_json"]), "customInstruction": row["custom_instruction"],
             "revision": json.loads(row["revision_json"]), "createdAt": row["created_at"]} for row in mentor_rows
        ],
        "approvals": [
            {"id": row["id"], "ideaId": row["idea_id"], "evaluationId": row["evaluation_id"], "decision": row["decision"],
             "notes": row["notes"], "createdAt": row["created_at"]} for row in approval_rows
        ],
        "artifacts": [
            {"id": row["id"], "ideaId": row["idea_id"], "approvalId": row["approval_id"], "title": row["title"],
             "url": row["url"], "metadata": json.loads(row["metadata_json"]), "createdAt": row["created_at"]} for row in artifact_rows
        ],
    }
