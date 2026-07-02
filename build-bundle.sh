#!/bin/bash
# Build production bundle by concatenating JS modules into a single IIFE.
# Strips import/export statements since functions share a single closure.

set -euo pipefail

OUTPUT="js/bundle.js"

# Files in dependency order (no-dependency modules first).
FILES=(
  js/theme.js
  js/utils.js
  js/data.js
  js/api.js
  js/conversions.js
  js/index.js
  js/recipes.js
  js/recipe-detail.js
  js/import.js
  js/meal-log.js
  js/health.js
  js/app.js
)

echo "(() => {" > "$OUTPUT"
echo "  'use strict';" >> "$OUTPUT"

for file in "${FILES[@]}"; do
  name=$(basename "$file")
  echo "" >> "$OUTPUT"
  echo "  // ============================================================" >> "$OUTPUT"
  echo "  // $name" >> "$OUTPUT"
  echo "  // ============================================================" >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  # Strip import/export lines, then indent remaining lines
  sed -E '/^[[:space:]]*(import|export)[[:space:]]+/d' "$file" \
    | sed -E 's/^/  /' \
    >> "$OUTPUT"
done

echo "" >> "$OUTPUT"
echo "})();" >> "$OUTPUT"

echo "Bundle written to $OUTPUT ($(wc -l < "$OUTPUT" | tr -d ' ') lines)"