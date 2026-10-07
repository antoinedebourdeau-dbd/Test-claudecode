# next-steps — mod Claude Code

À la fin de chaque réponse, Claude propose trois prochaines étapes, affichées en boutons au-dessus du prompt.
Un clic (ou la touche `1`/`2`/`3`) envoie la suggestion comme si vous l'aviez tapée ; `Ignorer` (touche `x`) les masque.

## Installation

```
/plugin install next-steps --marketplace antoinedebourdeau-dbd/Test-claudecode
```

## Commande

- `/next-steps off` — désactive les suggestions (persistant entre sessions)
- `/next-steps on` — les réactive
- `/next-steps clear` — masque les suggestions en cours

## Fonctionnement

- `prompt.compose` ajoute au prompt système la consigne de terminer par un bloc `<next-steps>` de trois lignes ;
- `turn.complete` extrait les trois suggestions ;
- `ui.render (AssistantMessage)` masque le bloc brut dans le transcript ;
- `ui.render (AbovePrompt)` dessine les boutons ; `$.prompt.submit({ asUser: true })` envoie la suggestion choisie.

Tests : `claude plugin test .`
