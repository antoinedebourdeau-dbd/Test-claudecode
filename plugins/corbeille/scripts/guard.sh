#!/usr/bin/env bash
# PreToolUse (Bash) : bloque les commandes de suppression définitive et renvoie Claude vers corbeille.sh.
# Désactivable ponctuellement avec CORBEILLE_MODE=off.

[ "${CORBEILLE_MODE:-on}" = "off" ] && exit 0

input=$(cat)
if command -v jq >/dev/null 2>&1; then
  cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
elif command -v python3 >/dev/null 2>&1; then
  cmd=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))')
else
  cmd="$input"
fi
[ -z "$cmd" ] && exit 0

# Ignore le corps des heredocs (messages de commit, fichiers écrits…), sauf s'il est passé à un shell.
if ! printf '%s' "$cmd" | grep -Eq '(^|[[:space:]|])(ba|z|da)?sh[[:space:]]*(-s)?[[:space:]]*<<'; then
  cmd=$(printf '%s\n' "$cmd" | awk '
    delim != "" { t = $0; gsub(/^[ \t]+|[ \t]+$/, "", t); if (t == delim) delim = ""; next }
    { print; if (match($0, /<<-?[ \t]*["\047]?[A-Za-z_][A-Za-z0-9_]*/)) {
        d = substr($0, RSTART, RLENGTH); sub(/^<<-?[ \t]*["\047]?/, "", d); delim = d } }')
fi

here=$(cd -- "$(dirname -- "$0")" && pwd -P)
trash="$here/corbeille.sh"

# Commande en position d'exécution : début, après ; & | ( ` $( && || sudo xargs then do -exec, éventuellement \rm ou /bin/rm.
pre='(^|[;&|(`]|\$\(|(^|[[:space:]])(sudo|xargs|then|do|else|command|-exec|-execdir|-ok))[[:space:]]*'
bin='\\?(/usr)?(/bin/)?'
hit=""
del='(rm|rmdir|unlink|shred|srm)([[:space:]]|;|$)'
if printf '%s' "$cmd" | grep -Eq "${pre}${bin}${del}|xargs[^;&|]*[[:space:]]${bin}${del}"; then
  hit="rm/rmdir/unlink"
elif printf '%s' "$cmd" | grep -Eq '(^|[[:space:]])find[[:space:]].*[[:space:]]-delete([[:space:]]|;|$)'; then
  hit="find -delete"
elif printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+clean([[:space:]]|$)' \
  && ! printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+clean[^;&|]*(-[a-zA-Z]*n|--dry-run)'; then
  hit="git clean"
fi
[ -z "$hit" ] && exit 0

reason="Mode corbeille actif : suppression définitive interdite ($hit). Déplace les éléments vers la corbeille du système avec : \"$trash\" <chemin>... (accepte -r/-f, ignorés). Pour find/git clean, liste d'abord les chemins (find sans -delete, git clean -n) puis passe-les à ce script. Montre ensuite à l'utilisateur la liste affichée par le script."

if command -v jq >/dev/null 2>&1; then
  jq -n --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
else
  echo "$reason" >&2
  exit 2
fi
