---
name: trouver-recette-famille
description: Trouver des idées de recettes à partir des ingrédients disponibles, adaptées aux goûts de la famille (enfant difficile), puis donner la recette complète avec sa source.
---

# Trouver une recette pour la famille

À utiliser quand l'utilisateur demande des idées de repas à partir d'un ingrédient principal (ex. steak haché) et de ce qu'il a sous la main.

Répondre en français québécois, sur un ton simple et chaleureux. L'utilisateur est souvent sur mobile ou en mode vocal : réponses courtes, listes faciles à lire.

## Préférences connues de la famille

L'utilisateur est un papa qui cuisine pour sa fille. Ce qu'elle n'aime pas :
- les champignons
- les plats épicés
- les plats trop en sauce ou où tout est mélangé
- les potages, soupes et mijotés

Ce qui marche bien : des plats simples, les aliments séparés dans l'assiette, des formats « enfant » (mini burgers, boulettes, croquettes, pains de viande en moules à muffins), du fromage, des pâtes. Le macaroni cheeseburger a été approuvé.

Si l'utilisateur mentionne de nouvelles préférences, en tenir compte et proposer de mettre cette liste à jour.

## Étapes

1. **Faire l'inventaire.** Noter l'ingrédient principal et ce qui est disponible (ex. patates, céleri, salade, pâtes, crème). Ne pas poser de questions si l'info suffit.
2. **Proposer une liste d'idées.** Environ 6 à 10 idées, chacune en une ligne : nom en gras, origine ou style entre parenthèses si pertinent, et une courte description. Utiliser le plus possible les ingrédients disponibles. Filtrer d'emblée selon les préférences ci-dessus : pas de champignons, pas d'épices fortes, privilégier les plats où les éléments restent séparés.
3. **Ajuster si ça ne passe pas.** Si l'utilisateur dit que les idées ne plaisent pas à sa fille, demander ce qu'elle n'aime pas (une seule question), puis proposer une nouvelle liste plus ciblée.
4. **Donner la recette complète de l'idée choisie.**
   - Chercher une vraie recette en ligne (WebSearch, puis WebFetch de la page) pour s'en inspirer.
   - L'adapter aux goûts de la famille (ex. enlever sauce piquante et poudre chili) et le dire en une ligne.
   - Utiliser les ingrédients disponibles quand c'est possible (ex. la crème pour rendre la sauce plus onctueuse).
   - Format : nombre de portions, liste d'ingrédients en mesures métriques ET impériales (g / lb, ml / tasses), puis étapes numérotées courtes.
   - Suggérer un accompagnement servi à part (bâtonnets de céleri, salade) et préciser la conservation des restes.
   - Toujours citer la source avec un lien : « Je me suis inspiré de [nom de la recette](URL) ». Paraphraser la recette, ne pas la recopier mot pour mot.
5. **Conclure brièvement.** Offrir d'autres idées pour une prochaine fois, sans en rajouter.
