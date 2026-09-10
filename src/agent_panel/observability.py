from __future__ import annotations

import json
from dataclasses import asdict, is_dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


class RunLogger:
    def __init__(self, run_dir: Path):
        self.run_dir = run_dir
        self.run_dir.mkdir(parents=True, exist_ok=True)
        self.path = run_dir / "events.jsonl"

    def event(self, stage: str, status: str, **data: Any) -> None:
        serialised = {key: asdict(value) if is_dataclass(value) else value for key, value in data.items()}
        record = {"at": datetime.now(UTC).isoformat(), "stage": stage, "status": status, **serialised}
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record) + "\n")
