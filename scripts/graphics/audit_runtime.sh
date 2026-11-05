#!/usr/bin/env bash
set -euo pipefail
ROOT=${1:?staging root required}
PREFIX=/opt/groove-graphics
report=${AUDIT_REPORT:-/tmp/graphics-runtime-audit.log}
: > "$report"
failed=0
while IFS= read -r -d '' binary; do
    if ! readelf -h "$binary" >/dev/null 2>&1; then continue; fi
    relative=${binary#"$ROOT"}
    tree=$(lddtree --root "$ROOT" "$relative" 2>&1) || { echo "$tree" >> "$report"; failed=1; continue; }
    if grep -Eq '^[[:space:]]+[^[:space:]]+[[:space:]]+=>[[:space:]]+(None|not found)' <<< "$tree"; then
        echo "$tree" >> "$report"
        failed=1
    fi
done < <(find "$ROOT$PREFIX/bin" "$ROOT$PREFIX/sbin" "$ROOT$PREFIX/lib" ${WAYFIRE_AUDIT_ROOT:+"$WAYFIRE_AUDIT_ROOT"} -type f -print0)
if [[ "$failed" != 0 ]]; then cat "$report"; exit 1; fi
echo 'ELF runtime dependencies resolved inside the staging root' | tee -a "$report"
