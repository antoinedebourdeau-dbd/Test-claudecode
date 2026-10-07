# corbeille — mode Claude Code

Chaque fois que Claude s'apprête à supprimer un fichier ou un dossier, l'élément est déplacé vers la corbeille du système au lieu d'être effacé, et la liste de ce qui a été déplacé s'affiche.

## Installation (toutes vos sessions)

```
/plugin marketplace add antoinedebourdeau-dbd/Test-claudecode
/plugin install corbeille@next-steps
```

Dans ce dépôt, le mode est déjà actif via `.claude/settings.json`.

## Fonctionnement

- **PreToolUse (Bash)** — `scripts/guard.sh` bloque `rm`, `rmdir`, `unlink`, `shred`, `find … -delete`, `xargs rm`, `git clean` (hors `-n`) et renvoie Claude vers `scripts/corbeille.sh`.
- **`scripts/corbeille.sh chemin…`** — déplace vers la corbeille native :
  - macOS : `/usr/bin/trash` (macOS 14+), sinon Finder, sinon `~/.Trash` ;
  - Linux : `gio trash`, sinon `trash-put`, sinon `~/.local/share/Trash` (spec freedesktop, restaurable depuis le gestionnaire de fichiers) ;
  - Windows (Git Bash) : Corbeille via PowerShell.
- **PostToolUse (Bash)** — `scripts/report.sh` affiche la liste des éléments déplacés.
- **`/corbeille`** — affiche les 20 derniers déplacements (journal : `~/.claude/corbeille/journal.log`).

Désactivation ponctuelle : `CORBEILLE_MODE=off` dans l'environnement, ou `/plugin disable corbeille`.

## Limites

Tests du garde-fou : `plugins/corbeille/scripts/test-guard.sh`.

Le garde-fou porte sur les commandes shell. Une suppression faite à l'intérieur d'un programme (ex. `shutil.rmtree` dans un script Python) ou par un outil tiers n'est pas interceptée. `git rm` reste autorisé (contenu récupérable via git).
