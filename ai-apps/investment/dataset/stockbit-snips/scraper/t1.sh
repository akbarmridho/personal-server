#!/bin/bash

TARGET_DIR="cheerio_output"

MARKER="Kutipan menarik dari komunitas Stockbit minggu ini"

find "$TARGET_DIR" -type f -name "*.md" | while read -r file; do
    if grep -q "$MARKER" "$file"; then
        # BSD sed requires a backup extension, even empty one must be ''
        sed -i '' "/$MARKER/,\$d" "$file"
        echo "Updated: $file"
    fi
done
