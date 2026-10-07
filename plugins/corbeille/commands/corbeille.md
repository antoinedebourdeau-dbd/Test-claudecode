---
description: Affiche les derniers éléments déplacés vers la corbeille par le mode corbeille
allowed-tools: Bash(tail:*)
---

Journal du mode corbeille (20 dernières entrées) :

!`tail -n 20 "$HOME/.claude/corbeille/journal.log" 2>/dev/null || echo "Journal vide."`

Présente cette liste à l'utilisateur sous forme de tableau (date, chemin, type/taille), sans commentaire superflu.
