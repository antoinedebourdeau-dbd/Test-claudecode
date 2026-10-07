# progress-bar — mod Claude Code

Pendant une tâche en plusieurs étapes, affiche au-dessus du prompt (et dans la ligne de statut) :

```
████████████░░░░░░░░░░░░░░░░░░ 2/4 (50 %) · ⏱ 01:23
▶ Étape 3 : Calcul des statistiques
```

- **étapes faites / total** et pourcentage ;
- **étape en cours** (forme active de la tâche) ;
- **temps écoulé** depuis la création de la liste, rafraîchi chaque seconde, figé quand tout est terminé.

## Installation

```
/plugin install progress-bar --marketplace antoinedebourdeau-dbd/Test-claudecode
```

## Fonctionnement

- `tool.call` sur `TaskCreate` / `TaskUpdate` (et `TodoWrite` sur les versions qui l'utilisent) tient la liste des étapes dans `$.state` ;
- `session.start` lance un `$.clock.every(1000)` qui rafraîchit le chrono tant qu'une tâche est en cours ;
- `ui.render (AbovePrompt)` dessine la barre ; `$.ui.status` en donne une version compacte ;
- une nouvelle demande après une tâche terminée remet le compteur à zéro.

Tests : `claude plugin test plugins/progress-bar`
