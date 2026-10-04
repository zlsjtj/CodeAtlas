"""Encode the unaltered browser frames; Pillow is a recording-only dependency."""
import json
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
recording_root = root / "data" / "recording"
latest = json.loads((recording_root / "latest.json").read_text(encoding="utf-8"))
folder = recording_root / latest["directory"]
receipt = json.loads((folder / "recording.json").read_text(encoding="utf-8"))
frames = receipt["frames"]
images = [Image.open(folder / frame["file"]).convert("RGB") for frame in frames]
durations = [max(20, frames[index + 1]["elapsed_ms"] - frame["elapsed_ms"]) for index, frame in enumerate(frames[:-1])]
durations.append(max(20, receipt["duration_ms"] - frames[-1]["elapsed_ms"]))
images[0].save(root / "docs/assets/codeatlas-reading.gif", save_all=True,
               append_images=images[1:], duration=durations, loop=0, optimize=True)
print(f"Encoded {len(images)} frames; {sum(durations) / 1000:.1f} seconds, original speed.")
evidence = {key: value for key, value in receipt.items() if key not in {"frames", "network"}}
evidence["captured_frames"] = len(images)
evidence["gif_duration_ms"] = sum(int(duration / 10) * 10 for duration in durations)
(root / "docs/evidence/reading-demo.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
