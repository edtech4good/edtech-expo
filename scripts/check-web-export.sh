#!/usr/bin/env bash
# Fails if a dev-only asset shipped in a production web export.
# Usage: scripts/check-web-export.sh <export-dir>
# The dev kit gallery bundles a generated tone (assets/dev-kit-tone.wav) that
# must be reachable only under __DEV__, so it must not be in `expo export`.
set -uo pipefail
dir="${1:?usage: check-web-export.sh <export-dir>}"
if [[ ! -d "$dir" ]]; then
  echo "check-web-export: $dir is not a directory" >&2
  exit 1
fi
if [[ -z "$(find "$dir" -type f -name '*.js' -print -quit)" ]]; then
  echo "check-web-export: no JS in $dir, the export looks empty" >&2
  exit 1
fi
hits="$(find "$dir" -type f -name 'dev-kit-tone*' -print)"
# Also catch it referenced from the bundle by name.
refs="$(grep -rl 'dev-kit-tone' "$dir" 2>/dev/null || true)"
if [[ -n "$hits$refs" ]]; then
  echo "check-web-export: FAILED, dev-only asset in the production export:" >&2
  echo "$hits" "$refs" >&2
  exit 1
fi
echo "check-web-export: OK, no dev-kit-tone asset or reference in $dir"
