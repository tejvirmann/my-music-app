#!/bin/bash
# Download the newest successful iOS build (unsigned .ipa) from GitHub Actions
# into ~/Downloads/MyMusic-latest/MyMusic-unsigned.ipa, ready for Sideloadly.
set -euo pipefail

REPO="tejvirmann/my-music-app"
OUT="${1:-$HOME/Downloads/MyMusic-latest}"

RUN=$(gh run list --repo "$REPO" --workflow build-ios.yml --status success --limit 1 --json databaseId -q '.[0].databaseId')
[ -n "$RUN" ] || { echo "No successful build found."; exit 1; }
echo "Latest successful run: $RUN"

TMP=$(mktemp -d)
gh run download "$RUN" --repo "$REPO" -D "$TMP"
IPA=$(find "$TMP" -type f -name '*.ipa' | head -1)
[ -n "$IPA" ] || { echo "No .ipa in artifact."; exit 1; }

rm -rf "$OUT"; mkdir -p "$OUT"
mv "$IPA" "$OUT/MyMusic-unsigned.ipa"
rm -rf "$TMP"
echo "Ready: $OUT/MyMusic-unsigned.ipa"
