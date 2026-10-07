# modes-antoine

Quatre modes de travail actifs dans chaque session Claude Code, sans rien retaper :

1. **Cadrage express** : exécution directe, une seule salve de questions groupées si besoin, pas de périmètre élargi.
2. **Faisabilité d'abord** : l'environnement (machine, outils, modules Python) est sondé au démarrage ; ce qui manque est annoncé avec un plan B.
3. **Livrable Debourdeau** : `~/Downloads/<Projet>/` versionné, à ton nom, révisions suivies + clean, accents, pas de tiret cadratin.
4. **Carnet de projet** : un `CARNET.md` par projet (index injecté à chaque session) et un annuaire `~/.claude/annuaire.md`.

## Installation (une fois, sur le Mac)

```
/plugin install modes-antoine --marketplace antoinedebourdeau-dbd/Test-claudecode
```

Le plugin s'installe au niveau utilisateur : il s'applique à toutes les sessions Claude Code du Mac (terminal et onglet Code de l'app), quel que soit le dossier.

## Fonctionnement

- `session.start` lance `scripts/probe.sh` : machine, outils présents/absents, carnets dans `~/Downloads/*/CARNET.md`, annuaire (créé à partir de `modeles/annuaire.md` au premier lancement).
- `prompt.compose` ajoute les règles et cet état au prompt système de chaque requête : elles tiennent toute la session, y compris après compaction.
- Modifier une règle : éditer `RULES` dans `hooks/register.ts`, pousser, puis `/plugin update modes-antoine`.

Tests : `claude plugin test modes-antoine`
