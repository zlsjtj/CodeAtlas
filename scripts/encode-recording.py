"""Encode the unaltered browser frames; Pillow is a recording-only dependency."""
import json
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
folder = root / "data" / "recording"
receipt = json.loads((folder / "recording.json").read_text(encoding="utf-8"))
frames = receipt["frames"]
images = [Image.open(folder / frame["file"]).convert("RGB") for frame in frames]
durations = [max(20, frames[index + 1]["elapsed_ms"] - frame["elapsed_ms"]) for index, frame in enumerate(frames[:-1])]
durations.append(max(20, receipt["duration_ms"] - frames[-1]["elapsed_ms"]))
images[0].save(root / "docs/assets/codeatlas-reading.gif", save_all=True,
               append_images=images[1:], duration=durations, loop=0, optimize=True)
print(f"Encoded {len(images)} frames; {sum(durations) / 1000:.1f} seconds, original speed.")
