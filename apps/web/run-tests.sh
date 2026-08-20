#!/bin/sh
# M2 seed → UV unit tests (Vitest).
cd "$(dirname "$0")"
exec npx vitest run
