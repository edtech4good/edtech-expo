#!/usr/bin/env bash
# Typecheck guard: fails only if the tsc error count regresses past a
# committed baseline. Phase 0 item 0.6 (docs/ci-cd-plan.md) is clearing
# these errors to zero; until then this keeps new ones from landing while
# not blocking on the pre-existing backlog.
#
# Counts errors from tsc's own compiled output, never a regex over source
# (CLAUDE.md: "Count from compiled code or the database, never a regex over
# source").
set -uo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
baseline_file="$script_dir/tsc-baseline-count"

if [[ ! -f "$baseline_file" ]]; then
  echo "tsc-guard: missing $baseline_file" >&2
  exit 1
fi

baseline="$(tr -d '[:space:]' < "$baseline_file")"
if ! [[ "$baseline" =~ ^[0-9]+$ ]]; then
  echo "tsc-guard: $baseline_file does not contain a plain integer (got '$baseline')" >&2
  exit 1
fi

tsc_output="$(mktemp)"
trap 'rm -f "$tsc_output"' EXIT

cd "$repo_root"
npx tsc --noEmit -p . > "$tsc_output" 2>&1
tsc_exit=$?

count="$(grep -c "error TS" "$tsc_output")"

echo "----- tsc output -----"
cat "$tsc_output"
echo "-----------------------"
echo "tsc-guard: $count error(s) found, baseline is $baseline"

if [[ "$count" -gt "$baseline" ]]; then
  echo ""
  echo "tsc-guard: FAILED — error count ($count) exceeds the baseline ($baseline)."
  echo "tsc-guard: this PR introduced new type errors, or removed a suppression"
  echo "tsc-guard: that was hiding one. Fix the new error(s), or if this PR"
  echo "tsc-guard: intentionally reduces the backlog, lower the number in"
  echo "tsc-guard: scripts/tsc-baseline-count to the new (smaller) count."
  exit 1
fi

if [[ "$count" -lt "$baseline" ]]; then
  echo ""
  echo "tsc-guard: error count ($count) is BELOW the baseline ($baseline)."
  echo "tsc-guard: nice work — lower scripts/tsc-baseline-count to $count so"
  echo "tsc-guard: this improvement can't silently regress."
fi

if [[ "$tsc_exit" -ne 0 && "$count" -eq 0 ]]; then
  # tsc exited non-zero but we found no "error TS" lines — something other
  # than a type error broke the compiler run itself (e.g. a config problem).
  echo ""
  echo "tsc-guard: tsc exited $tsc_exit with 0 'error TS' lines — treating as a failure."
  exit 1
fi

exit 0
