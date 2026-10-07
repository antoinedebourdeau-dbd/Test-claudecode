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

---

# chaos-bar — mod Claude Code

Une barre de jauges au-dessus du prompt, ambiance néon radioactif :

```
☢ CHAOS  5h ▒▒▒▒▒▓▓▓▓░ 8% ↻1h30  Sem ▒▒▒▒░░░░░░ 59% ↻3j3h  Fable ▒░░░░░░░░░ 88%  Ctx ▒▒▒▒▒▓▓▓▓░ 86% 172k/200k ⚠ /compact !  $4.20 ($2.10/h)
```

- **5h / Sem / Fable** : pourcentage **restant** sur la fenêtre de session (5 h), la fenêtre hebdomadaire et le quota hebdo par modèle (celui que Claude Code nomme « Fable limit »), avec le compte à rebours jusqu'au reset (`↻`).
- **Ctx** : remplissage de la fenêtre de contexte ; « bientôt /compact » dès 70 %, `⚠ /compact !` en surbrillance dès 85 % (+ un toast).
- **$** : coût de la session tel que `/cost` le calcule (équivalent tarif API ; sur abonnement, ce n'est pas facturé) et la vitesse de dépense par heure.
- Couleurs : vert acide < 50 % utilisé, jaune toxique < 75 %, orange < 90 %, rouge alarme au-delà (inversé). Le titre change de couleur et de glyphe à chaque tour.
- Toast quand un quota passe 90 % utilisé.

## Installation

```
/plugin install chaos-bar --marketplace antoinedebourdeau-dbd/Test-claudecode
```

## Commande

- `/chaos-bar off` — masque la barre (persistant entre sessions)
- `/chaos-bar on` — la réaffiche

Les quotas n'apparaissent qu'avec un abonnement Claude (Pro/Max/Team), après la première réponse de la session. Si le serveur ne renvoie pas de fenêtre « Fable », la jauge affiche `—`.

Tests : `claude plugin test chaos-bar`
