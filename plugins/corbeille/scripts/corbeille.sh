#!/usr/bin/env bash
# Déplace fichiers et dossiers vers la corbeille du système au lieu de les effacer.
# Usage : corbeille.sh [-r] [-f] [--] chemin...   (les options de rm sont acceptées et ignorées)
# Affiche la liste de ce qui a été déplacé et l'ajoute au journal ~/.claude/corbeille/journal.log.

set -u

STATE_DIR="${CORBEILLE_STATE_DIR:-$HOME/.claude/corbeille}"
JOURNAL="$STATE_DIR/journal.log"
PENDING="$STATE_DIR/pending.txt"
mkdir -p "$STATE_DIR"

force=0
paths=()
end_opts=0
for a in "$@"; do
  if [ "$end_opts" = 0 ] && [ "$a" = "--" ]; then end_opts=1; continue; fi
  if [ "$end_opts" = 0 ] && [[ "$a" == -* ]] && [ "$a" != "-" ]; then
    [[ "$a" == *f* && "$a" != --* ]] && force=1
    [ "$a" = "--force" ] && force=1
    continue
  fi
  paths+=("$a")
done

if [ "${#paths[@]}" -eq 0 ]; then
  echo "corbeille.sh : aucun chemin fourni" >&2
  exit 1
fi

abspath() {
  local p="$1" d b
  d=$(dirname -- "$p"); b=$(basename -- "$p")
  (cd -- "$d" 2>/dev/null && printf '%s/%s\n' "$(pwd -P)" "$b")
}

# Repli freedesktop (Linux sans gio ni trash-cli) : ~/.local/share/Trash avec .trashinfo.
freedesktop_trash() {
  local src="$1" base="${XDG_DATA_HOME:-$HOME/.local/share}/Trash" name n=1
  mkdir -p "$base/files" "$base/info"
  name=$(basename -- "$src")
  local target="$name"
  while [ -e "$base/files/$target" ] || [ -e "$base/info/$target.trashinfo" ]; do
    target="$name.$n"; n=$((n + 1))
  done
  local enc
  enc=$(printf '%s' "$src" | sed -e 's/%/%25/g' -e 's/ /%20/g')
  printf '[Trash Info]\nPath=%s\nDeletionDate=%s\n' "$enc" "$(date +%Y-%m-%dT%H:%M:%S)" \
    > "$base/info/$target.trashinfo" || return 1
  mv -- "$src" "$base/files/$target" || { rm -f -- "$base/info/$target.trashinfo"; return 1; }
}

# Repli macOS sans /usr/bin/trash ni Finder scriptable : ~/.Trash avec nom unique.
mac_dot_trash() {
  local src="$1" name target n=1
  name=$(basename -- "$src"); target="$name"
  while [ -e "$HOME/.Trash/$target" ]; do target="$name $(date +%H.%M.%S)-$n"; n=$((n + 1)); done
  mv -- "$src" "$HOME/.Trash/$target"
}

to_trash() {
  local src="$1"
  case "$(uname -s)" in
    Darwin)
      if [ -x /usr/bin/trash ]; then /usr/bin/trash -- "$src" >/dev/null 2>&1 && return 0; fi
      osascript -e 'on run argv' -e 'tell application "Finder" to delete (POSIX file (item 1 of argv) as alias)' \
        -e 'end run' "$src" >/dev/null 2>&1 && return 0
      mac_dot_trash "$src"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      local win
      win=$(cygpath -w "$src")
      powershell.exe -NoProfile -Command "Add-Type -AssemblyName Microsoft.VisualBasic;
        \$p='$win'; if (Test-Path -LiteralPath \$p -PathType Container) {
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory(\$p,'OnlyErrorDialogs','SendToRecycleBin') } else {
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(\$p,'OnlyErrorDialogs','SendToRecycleBin') }" >/dev/null
      ;;
    *)
      if command -v gio >/dev/null 2>&1 && gio trash -- "$src" >/dev/null 2>&1; then return 0; fi
      if command -v trash-put >/dev/null 2>&1 && trash-put -- "$src" >/dev/null 2>&1; then return 0; fi
      freedesktop_trash "$src"
      ;;
  esac
}

moved=()
failed=0
for p in "${paths[@]}"; do
  if [ ! -e "$p" ] && [ ! -L "$p" ]; then
    [ "$force" = 1 ] || { echo "⚠️  introuvable : $p" >&2; failed=1; }
    continue
  fi
  abs=$(abspath "$p") || abs="$p"
  if [ -d "$p" ] && [ ! -L "$p" ]; then
    kind="dossier, $(find "$p" -mindepth 1 | wc -l | tr -d ' ') élément(s)"
  else
    kind="fichier"
  fi
  size=$(du -sh -- "$p" 2>/dev/null | cut -f1)
  if to_trash "$abs"; then
    line="$abs  ($kind, $size)"
    moved+=("$line")
    printf '%s\t%s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$line" >> "$JOURNAL"
  else
    echo "❌ échec du déplacement vers la corbeille : $p" >&2
    failed=1
  fi
done

if [ "${#moved[@]}" -gt 0 ]; then
  {
    echo "🗑️  Déplacé(s) vers la corbeille (${#moved[@]}) :"
    for m in "${moved[@]}"; do echo "   • $m"; done
  } | tee -a "$PENDING"
fi

exit "$failed"
