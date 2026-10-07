import type { Register } from 'claude-code'

// Les quatre modes, ajoutés au prompt système de chaque requête : ils tiennent toute la session,
// y compris après une compaction du contexte.
export const RULES = `# Modes de travail d'Antoine (permanents, prioritaires sur les skills de process)

## 1. Cadrage express
- Demande claire : exécuter directement. Pas de brainstorming, spec, plan ni validation intermédiaire, même si un skill de process (brainstorming, superpowers) le propose.
- Information vraiment manquante : UNE seule salve de questions groupées au début (AskUserQuestion, 4 max), jamais une par une. Si Antoine demande qu'on lui pose des questions, en poser.
- Procédure lourde ou irréversible déclenchée par un mail ou une relance (DNS, migration, abonnement) : vérifier d'abord si elle est nécessaire et le dire en deux lignes avant d'agir.
- Ne pas élargir le périmètre : aucune analyse, figure, identifiant ou fonctionnalité non demandés ; ne pas refaire ce qui est déclaré validé. Aucun commit, push ou envoi non demandé.

## 2. Faisabilité d'abord
- Avant de commencer, confronter la tâche à l'environnement ci-dessous. S'il manque un outil, un accès ou des fichiers : le dire en une ligne et proposer aussitôt un plan B (installation rapide, autre outil, livrable de substitution).
- Session dans un conteneur cloud : les fichiers et applications du Mac sont inaccessibles, le dire immédiatement plutôt que de faire faire les manipulations à Antoine.
- Applications Mac natives (WhatsApp, nouvel Outlook) : pas plus de deux minutes de tentative, puis texte prêt à coller ou brouillon Gmail.
- Service de recherche en erreur d'accès ou en timeout (Elicit, Consensus) : basculer sans réessayer en boucle (PubMed E-utilities, Crossref).
- Quota : deux sous-agents en parallèle au plus ; résultats intermédiaires écrits dans le dossier de livraison, jamais seulement en dossier temporaire.

## 3. Livrable Debourdeau
- Un seul dossier par projet : ~/Downloads/<Projet>/. Versions suffixées _v1, _v2 ; l'ancienne version va dans <Projet>/archives/. Pas de dossiers parallèles. Donner le chemin complet à la fin.
- Auteur : Antoine Debourdeau (métadonnées, révisions suivies). Aucune mention d'IA, Claude ou Codex dans les fichiers.
- Manuscrit ou document modifié : version avec révisions suivies + version clean.
- Français par défaut, anglais académique pour la rédaction scientifique. Accents partout. Aucun tiret cadratin ni demi-cadratin en incise. Ces règles s'appliquent dès l'écriture, pas en correction finale.
- Données tabulaires livrées en clair : libellés lisibles, pas de codes ni de table de correspondance à part.
- Avant de livrer, relire le livrable contre ces règles.

## 4. Carnet de projet
- Chaque projet a un CARNET.md à la racine de son dossier (modèle : objet, fichiers clés, décisions et interdits datés, état). Index des carnets existants ci-dessous.
- Si la demande touche un projet qui a un carnet, le lire AVANT toute question. S'il n'en a pas et que le travail dépasse une simple réponse, le créer.
- Mettre le carnet à jour à chaque étape d'une tâche longue (pour reprendre après une coupure) et en fin de tâche : 40 lignes max, l'état est réécrit, les décisions s'ajoutent.
- Annuaire ~/.claude/annuaire.md (ci-dessous) : orthographe des noms pour corriger la dictée, adresses, listes de diffusion. Le consulter avant de demander une adresse ; y ajouter toute nouvelle adresse ou orthographe fournie. Correspondants médicaux : base Notion « 👥 Correspondants ».`

export type Probe = { env: string; carnets: string; annuaire: string }

export function parseProbe(stdout: string): Probe {
  const block = (name: string) => {
    const m = new RegExp(`@@${name}\\n([\\s\\S]*?)(?=\\n?@@|$)`).exec(stdout)
    return (m?.[1] ?? '').trim()
  }
  return { env: block('ENV'), carnets: block('CARNETS'), annuaire: block('ANNUAIRE') }
}

export function buildSection(probe: Probe | undefined): string {
  if (!probe) return RULES
  return [
    RULES,
    `## Environnement de cette session\n${probe.env || 'inconnu'}`,
    `## Carnets de projet existants\n${probe.carnets || 'aucun'}`,
    `## Annuaire\n${probe.annuaire || 'vide'}`,
  ].join('\n\n')
}

let probe: Probe | undefined

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    try {
      const { stdout } = await $.process.run(['sh', `${$.plugin.root}/scripts/probe.sh`, $.plugin.root], { timeoutMs: 20000 })
      probe = parseProbe(stdout)
    } catch {
      probe = undefined
    }
    return started
  })

  on('prompt.compose', async ($, e, next) => {
    const { sections } = await next(e)
    return { sections: [...sections, { id: 'modes-antoine:modes', text: buildSection(probe), scope: 'session' as const }] }
  })
}
