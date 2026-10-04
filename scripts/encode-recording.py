"""Encode the unaltered browser frames; Pillow is a recording-only dependency."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageSequence

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--kind", choices=("reading", "workflow"), default="reading")
args = parser.parse_args()
recording_root = root / "data" / ("workflow-recording" if args.kind == "workflow" else "recording")
latest = json.loads((recording_root / "latest.json").read_text(encoding="utf-8"))
folder = recording_root / latest["directory"]
receipt = json.loads((folder / "recording.json").read_text(encoding="utf-8"))
locale = receipt.get("locale", "zh-CN")
if locale not in {"zh-CN", "en"}:
    raise ValueError(f"Unsupported recording locale: {locale}")
suffix = "-en" if locale == "en" else ""
frames = receipt["frames"]
images = [Image.open(folder / frame["file"]).convert("RGB") for frame in frames]
durations = [max(20, frames[index + 1]["elapsed_ms"] - frame["elapsed_ms"]) for index, frame in enumerate(frames[:-1])]
durations.append(max(20, receipt["duration_ms"] - frames[-1]["elapsed_ms"]))
target = root / f"docs/assets/codeatlas-{args.kind}{suffix}.gif"
images[0].save(target, save_all=True,
               append_images=images[1:], duration=durations, loop=0, optimize=True)
print(f"Encoded {len(images)} frames; {sum(durations) / 1000:.1f} seconds, original speed.")
evidence = {key: value for key, value in receipt.items() if key not in {"frames", "network"}}
evidence["captured_frames"] = len(images)
# GIF encoding merges identical frames and quantizes their combined durations.
with Image.open(target) as encoded:
    evidence["gif_duration_ms"] = sum(frame.info["duration"] for frame in ImageSequence.Iterator(encoded))
evidence["gif_sha256"] = hashlib.sha256(target.read_bytes()).hexdigest()
(root / f"docs/evidence/{args.kind}-demo{suffix}.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
