#!/usr/bin/env bash
# Set the app's name and icon (home screen AND inside the app). Edits app.json / assets/icon.png only; you commit and build.
# Usage: ./scripts/set-branding.sh "My App Name" [path/to/image.png|jpg]
set -euo pipefail
cd "$(dirname "$0")/.."

NAME="${1:-}"; IMG="${2:-}"
[ -n "$NAME" ] || { echo "Usage: $0 \"App Name\" [image]"; exit 1; }

python3 - "$NAME" <<'PY'
import json, sys
p = "app.json"
d = json.load(open(p))
d["expo"]["name"] = sys.argv[1]
json.dump(d, open(p, "w"), indent=2)
open(p, "a").write("\n")
PY
echo "App name set to: $NAME"

if [ -n "$IMG" ]; then
  [ -f "$IMG" ] || { echo "Image not found: $IMG"; exit 1; }
  tmp="$(mktemp -d)"
  # Square 1024px, and flatten transparency (iOS draws transparent icon areas black).
  sips -s format jpeg -z 1024 1024 "$IMG" --out "$tmp/i.jpg" >/dev/null
  sips -s format png "$tmp/i.jpg" --out assets/icon.png >/dev/null
  rm -rf "$tmp"
  echo "Icon written to assets/icon.png (1024x1024)"
fi
echo "Next: commit, push, run the build, then ./scripts/download-latest-build.sh and reinstall."
