from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app


def main() -> int:
    output_arg = sys.argv[1] if len(sys.argv) > 1 else None
    if output_arg is None:
        raise SystemExit("Usage: python backend/scripts/export_openapi.py <output_path>")

    output_path = Path(output_arg).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = app.openapi()
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
