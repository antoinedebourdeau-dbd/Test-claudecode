#!/bin/sh
# État de l'environnement, carnets de projet et annuaire, lus au démarrage de chaque session.
# Sortie en trois blocs séparés par des lignes @@ENV, @@CARNETS, @@ANNUAIRE.

echo "@@ENV"
if [ -d /Applications ]; then echo "machine : Mac local (fichiers du Mac accessibles)"; else echo "machine : conteneur cloud (fichiers du Mac NON accessibles)"; fi
for c in python3 Rscript magick convert ffmpeg pandoc soffice node; do
  if command -v "$c" >/dev/null 2>&1; then ok="$ok $c"; else ko="$ko $c"; fi
done
if command -v python3 >/dev/null 2>&1; then
  for m in docx openpyxl pptx pandas PIL fitz matplotlib; do
    if python3 -c "import $m" >/dev/null 2>&1; then ok="$ok py:$m"; else ko="$ko py:$m"; fi
  done
fi
echo "présents :${ok:- aucun}"
echo "absents :${ko:- aucun}"

echo "@@CARNETS"
for f in "$HOME"/Downloads/*/CARNET.md "$HOME"/Téléchargements/*/CARNET.md "$PWD"/CARNET.md; do
  [ -f "$f" ] || continue
  titre=$(grep -m1 -v '^\s*$' "$f" | sed 's/^#* *//' | cut -c1-90)
  echo "- $f : $titre"
done | sort -u | head -40

echo "@@ANNUAIRE"
# Premier lancement : crée l'annuaire vide à partir du modèle du plugin.
if [ ! -f "$HOME/.claude/annuaire.md" ] && [ -n "$1" ] && [ -d /Applications ]; then
  mkdir -p "$HOME/.claude" && cp "$1/modeles/annuaire.md" "$HOME/.claude/annuaire.md"
fi
if [ -f "$HOME/.claude/annuaire.md" ]; then head -c 12000 "$HOME/.claude/annuaire.md"; fi
