#!/bin/sh
# M2 seed + M3 patina + M4 kit-catalog + M5 sticker unit tests (Vitest).
cd "$(dirname "$0")"
exec npx vitest run
