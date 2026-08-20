#!/bin/sh
# M2–M6 unit tests (Vitest): seed, patina, kits, stickers, share URL.
cd "$(dirname "$0")"
exec npx vitest run
