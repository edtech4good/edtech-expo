#!/usr/bin/env bash
# Typecheck guard: an exact-match ratchet against a committed baseline.
# Phase 0 item 0.6 (docs/ci-cd-plan.md) is clearing these errors to zero;
# until then this keeps new ones from landing, and forces the baseline
# down whenever the count improves, without blocking on the pre-existing
# backlog.
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
if command -v yarn >/dev/null 2>&1; then
  yarn tsc --noEmit -p . > "$tsc_output" 2>&1
else
  ./node_modules/.bin/tsc --noEmit -p . > "$tsc_output" 2>&1
fi
tsc_exit=$?

count="$(grep -c "error TS" "$tsc_output")"

echo "----- tsc output -----"
cat "$tsc_output"
echo "-----------------------"
echo "tsc-guard: $count error(s) found, baseline is $baseline, tsc exit code $tsc_exit"

# --- Crash detection: checked BEFORE any baseline comparison. A crashed
# tsc run must never be read as "count is low, therefore pass". ---

crashed=0
crash_reason=""

if [[ "$tsc_exit" -ne 0 && "$tsc_exit" -ne 1 && "$tsc_exit" -ne 2 ]]; then
  crashed=1
  crash_reason="tsc exited with code $tsc_exit (expected 0, 1, or 2)"
elif [[ "$count" -eq 0 && "$tsc_exit" -ne 0 ]]; then
  crashed=1
  crash_reason="tsc exited $tsc_exit but reported 0 'error TS' lines — the compiler run itself failed before it could produce diagnostics"
elif grep -qE "error TS(5[0-9]{3}|6053)" "$tsc_output"; then
  crashed=1
  crash_reason="tsc reported a config-level error (TS5xxx/TS6053) — this is a broken tsconfig, not a source type error, and it stops the compiler after producing only that one diagnostic"
fi

if [[ "$crashed" -eq 1 ]]; then
  echo ""
  echo "tsc-guard: CRASHED — $crash_reason"
  echo "tsc-guard: fix the tsc invocation/config itself; this is not a baseline problem."
  exit 1
fi

# --- Baseline comparison, only once we know tsc actually ran to completion. ---

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
  echo "tsc-guard: FAILED — count ($count) is below baseline ($baseline). Lower scripts/tsc-baseline-count to $count in this PR."
  exit 1
fi

echo ""
echo "tsc-guard: OK — count ($count) matches the baseline ($baseline)."
exit 0
