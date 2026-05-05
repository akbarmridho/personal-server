#!/usr/bin/env bash
set -euo pipefail

URL="https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-04-30.zip"
DATA_DIR="$(dirname "$0")/../data"
OUTPUT="$DATA_DIR/usda-foundation.json"

if [ -f "$OUTPUT" ]; then
  echo "USDA Foundation Foods already exists at $OUTPUT, skipping."
  exit 0
fi

mkdir -p "$DATA_DIR"

TMP_ZIP=$(mktemp /tmp/usda-XXXXXX.zip)
trap 'rm -f "$TMP_ZIP"' EXIT

echo "Downloading USDA Foundation Foods..."
curl -fSL "$URL" -o "$TMP_ZIP"

echo "Extracting..."
unzip -o -j "$TMP_ZIP" "*.json" -d "$DATA_DIR"

# Rename to expected filename if different
JSON_FILE=$(find "$DATA_DIR" -maxdepth 1 -name "*.json" ! -name "usda-foundation.json" | head -1)
if [ -n "$JSON_FILE" ]; then
  mv "$JSON_FILE" "$OUTPUT"
fi

echo "Done: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
