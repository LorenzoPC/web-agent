# Index des assets

Mis à jour le 2026-11-19.

Inventaire des assets Claude Code et IA présents dans ce dépôt. Aucun fichier `.claude/settings.json`, `.claude/settings.local.json`, `.claude/agents/`, `.claude/commands/` ni `.mcp.json` n'existe pour l'instant.

## Agents

Aucun pour l'instant (pas de dossier `.claude/agents/` ni d'autre dossier d'agents Claude Code).

À noter : `scripts/seed-catalog-agents.ts` définit des personas d'agents pour le catalogue de l'application (Research, Summarizer, Support, Code Reviewer, Data Analyst, General Assistant). Ce sont des données du produit, pas des agents Claude Code.

## Modèles

Aucun modèle n'est référencé dans les settings Claude Code ni dans un frontmatter d'agent. Modèles utilisés par le code et la config du projet (clé de registre `fournisseur > modèle`) :

| Nom | Chemin | Description |
| --- | --- | --- |
| `local > llama3.2:latest` | [.env.example](.env.example), [src/app/api/conversation/analyze/route.ts](src/app/api/conversation/analyze/route.ts), [src/app/api/ecosystem/analyze/route.ts](src/app/api/ecosystem/analyze/route.ts) | Modèle Ollama local par défaut pour l'analyse de conversation (`CONVERSATION_ANALYSIS_MODEL`) et l'analyse de l'écosystème (`ECOSYSTEM_ANALYZE_MODEL`). |
| `local > nomic-embed-text` | [src/lib/tools/local-rag.ts](src/lib/tools/local-rag.ts) | Modèle d'embeddings local utilisé par l'outil de RAG local. |
| `openai > gpt-5.4` | [scripts/seed-catalog-agents.ts](scripts/seed-catalog-agents.ts), [src/db/schema.ts](src/db/schema.ts) | Modèle des agents Research, Support et Data Analyst du catalogue; exemple de `model_ref` dans le schéma. |
| `anthropic > claude-haiku-4.5` | [scripts/seed-catalog-agents.ts](scripts/seed-catalog-agents.ts) | Modèle des agents Summarizer et Code Reviewer du catalogue. |

Fournisseurs déclarés dans [src/lib/providers.ts](src/lib/providers.ts) : `local` et `remote` (endpoints compatibles OpenAI, ex. Ollama), `openai`, `anthropic`. Les données de démonstration de [src/lib/mock-data.ts](src/lib/mock-data.ts) citent aussi d'autres modèles (ex. Claude Opus 5.5) à titre d'exemple d'interface.

## Tools

Aucune permission d'outil (autorisée ou refusée) dans les settings, et aucun outil déclaré dans un frontmatter d'agent. Pas de commandes dans `.claude/commands/`.

Scripts et commandes utilitaires :

| Nom | Chemin | Description |
| --- | --- | --- |
| `npm run dev` / `build` / `start` | [package.json](package.json) | Serveur de dev, build et démarrage Next.js. |
| `npm run lint` | [package.json](package.json) | Lint avec ESLint. |
| `npm run db:generate` / `db:push` | [db/drizzle.config.ts](db/drizzle.config.ts) | Génère les migrations Drizzle et pousse le schéma vers la base. |
| seed-catalog-agents | [scripts/seed-catalog-agents.ts](scripts/seed-catalog-agents.ts) | Insère un ensemble de départ de personas d'agents (modèle, prompt système, rôle). |
| seed-catalog-curated | [scripts/seed-catalog-curated.ts](scripts/seed-catalog-curated.ts) | Insère les entrées de catalogue curées, dont celles réellement branchées dans `/api/pipeline/run`. |
| seed-task-categories | [scripts/seed-task-categories.ts](scripts/seed-task-categories.ts) | Insère les catégories de tâches du catalogue. |
| sync-catalog-models | [scripts/sync-catalog-models.ts](scripts/sync-catalog-models.ts) | Synchronise les modèles du catalogue; seuls ceux que le registre résout sont exécutables. |

Outils exécutables de l'application :

| Nom | Chemin | Description |
| --- | --- | --- |
| exa-search | [src/lib/tools/exa-search.ts](src/lib/tools/exa-search.ts) | Recherche web réelle via Exa. |
| github-mcp | [src/lib/tools/github-mcp.ts](src/lib/tools/github-mcp.ts) | Connexion réelle au serveur MCP distant de GitHub, ouverte et fermée à chaque appel. |
| local-rag | [src/lib/tools/local-rag.ts](src/lib/tools/local-rag.ts) | RAG local sans base vectorielle : découpe et embedde le texte fourni, classe par similarité cosinus. |

## Skills

| Nom | Chemin | Description |
| --- | --- | --- |
| neon | [.claude/skills/neon](.claude/skills/neon) (lien vers [.agents/skills/neon](.agents/skills/neon/SKILL.md)) | Vue d'ensemble de la plateforme Neon : Postgres, Auth, Data API, Object Storage, Compute Functions, AI Gateway. Source : `neondatabase/agent-skills` ([skills-lock.json](skills-lock.json)). |
| neon-postgres | [.claude/skills/neon-postgres](.claude/skills/neon-postgres) (lien vers [.agents/skills/neon-postgres](.agents/skills/neon-postgres/SKILL.md)) | Guides et bonnes pratiques pour Neon Serverless Postgres : connexion, branches, autoscaling, pooling, Neon Auth, CLI, SDK. Source : `neondatabase/agent-skills`. |
| trouver-recette-famille | [.claude/skills/trouver-recette-famille](.claude/skills/trouver-recette-famille/SKILL.md) | Trouver des idées de recettes à partir des ingrédients disponibles, adaptées aux goûts de la famille (enfant difficile), puis donner la recette complète avec sa source. |

## MCPs

Aucun pour l'instant (pas de `.mcp.json` ni de `mcpServers` dans des settings).

À noter : l'application elle-même se connecte au serveur MCP distant de GitHub via l'outil `github-mcp` (voir Tools).
