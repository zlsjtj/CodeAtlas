"""Encode browser frames, retaining the full recording alongside any edited showcase."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageSequence

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--kind", choices=("reading", "workflow", "showcase"), default="reading")
args = parser.parse_args()
recording_root = root / "data" / (f"{args.kind}-recording" if args.kind != "reading" else "recording")
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


def encode(target, images, durations):
    images[0].save(target, save_all=True,
                   append_images=images[1:], duration=durations, loop=0, optimize=True)
    with Image.open(target) as encoded:
        duration = sum(frame.info["duration"] for frame in ImageSequence.Iterator(encoded))
    return duration, hashlib.sha256(target.read_bytes()).hexdigest()


evidence = {key: value for key, value in receipt.items() if key not in {"frames", "network"}}
evidence["captured_frames"] = len(images)
if args.kind == "showcase":
    full = root / f"docs/assets/codeatlas-showcase-full{suffix}.gif"
    full_duration, full_hash = encode(full, images, durations)
    evidence["full_recording"] = {"file": full.name, "duration_ms": full_duration, "sha256": full_hash, "speed": "original"}
    # Show the finished route first, then replay the real actions that produced it.
    segments = [
        {"start_ms": 30000, "end_ms": 33000, "speed": 1, "step": "finished route"},
        {"start_ms": 1000, "end_ms": 6000, "speed": 2, "step": "search and open source"},
        {"start_ms": 10000, "end_ms": 16000, "speed": 2, "step": "title, note and save"},
        {"start_ms": 18000, "end_ms": 24000, "speed": 2, "step": "reorder stops"},
        {"start_ms": 33000, "end_ms": 35000, "speed": 1, "step": "download Markdown"},
    ]
    selected, edited_durations = [], []
    for segment in segments:
        for index, frame in enumerate(frames):
            end = frames[index + 1]["elapsed_ms"] if index + 1 < len(frames) else receipt["duration_ms"]
            overlap = min(end, segment["end_ms"]) - max(frame["elapsed_ms"], segment["start_ms"])
            if overlap > 0:
                selected.append(images[index])
                edited_durations.append(max(20, round(overlap / segment["speed"] / 10) * 10))
    images, durations = selected, edited_durations
    evidence.update(edited=True, speed="mixed; see segments", segments=segments)
evidence["gif_duration_ms"], evidence["gif_sha256"] = encode(target, images, durations)
print(f"Encoded {len(images)} frames; {evidence['gif_duration_ms'] / 1000:.2f} seconds.")
(root / f"docs/evidence/{args.kind}-demo{suffix}.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
