from pathlib import Path

from src.agent_panel.contracts import Idea
from src.agent_panel.pipeline import PanelPipeline, save_report
from src.agent_panel.providers import MockProvider


def test_mock_pipeline_completes_and_writes_artifacts(tmp_path: Path) -> None:
    pipeline = PanelPipeline(MockProvider(), tmp_path)
    idea = Idea("Test idea", "A runtime input used only by this automated test.", True)
    result = pipeline.run(idea, human_approved=True)
    report = save_report(result, tmp_path)
    assert result.diagnosis.decision.value == "narrow"
    assert len(result.reviews) == 4
    assert report.exists()
    assert (tmp_path / "events.jsonl").exists()


def test_pipeline_requires_human_approval(tmp_path: Path) -> None:
    pipeline = PanelPipeline(MockProvider(), tmp_path)
    idea = Idea("Test idea", "A runtime input used only by this automated test.", True)
    try:
        pipeline.run(idea, human_approved=False)
    except PermissionError as error:
        assert "Human approval" in str(error)
    else:
        raise AssertionError("Mentor stage must require a human checkpoint")
