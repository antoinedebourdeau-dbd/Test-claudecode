#!/usr/bin/env bash
# PostToolUse (Bash) : affiche à l'utilisateur la liste de ce que corbeille.sh vient de déplacer.

cat >/dev/null
pending="${CORBEILLE_STATE_DIR:-$HOME/.claude/corbeille}/pending.txt"
[ -s "$pending" ] || exit 0
msg=$(cat "$pending")
: > "$pending"
if command -v jq >/dev/null 2>&1; then
  jq -n --arg m "$msg" '{systemMessage:$m}'
else
  printf '%s\n' "$msg" >&2
fi
exit 0
