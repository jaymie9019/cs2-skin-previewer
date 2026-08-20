#!/bin/sh
# M2 seed → UV + M3 patina wear unit tests (Vitest).
cd "$(dirname "$0")"
exec npx vitest run
