# Valou — prototype de démonstration

Version propre et légère de Valou, faite pour être présentée à des investisseurs et à des professionnels de l'immobilier et du bâtiment.
L'appli complète (`index.html` à la racine) n'est pas modifiée.

Adresse une fois en ligne : https://hoono.be/demo/

## Organisation

| Fichier | Rôle |
|---|---|
| `index.html` | La page (vide : tout est affiché par `js/app.js`) |
| `css/valou.css` | L'identité Valou : bordeaux, or, crème, Outfit et Manrope |
| `js/moteur.js` | **Le moteur de calcul** (bas / moyen / haut, TVA, imprévus, coût total). Aucun affichage : seulement des calculs |
| `js/donnees.js` | Charge les fichiers de prix de la racine (`tarifs-reference.json`, `main-oeuvre.json`, `prix-hubo.json`, `aides-renovation.json`) et les prix publiés depuis le tableau de bord (Supabase) |
| `js/app.js` | Les écrans |
| `maison-demo.json` | **La maison de démonstration (fictive)**, affichée dès la première visite. Pour la remplacer par une vraie maison : changer ce fichier (mêmes champs). Seules les caractéristiques et les quantités y sont, les prix viennent toujours des références |
| `js/stockage.js`, `js/format.js` | Enregistrement des maisons sur l'appareil, mise en forme des montants |
| `tests/moteur.test.mjs` | Tests du moteur : `node --test demo/tests/moteur.test.mjs` |
| `tests/parcours.mjs` | Test du parcours complet dans un navigateur, avec captures : `node demo/tests/parcours.mjs captures` |

Les prix viennent des **mêmes fichiers** que l'appli complète, et du **tableau de bord des calculs** : un prix publié là est repris ici.

## Règles du calcul

- Aucun prix inventé : un prix absent est « à compléter ».
- Un poste dont un article n'a pas encore de prix garde la fourchette Valou pour le matériel, et il est signalé comme « Estimation ».
- Chaque poste affiche son niveau de fiabilité : Référence détaillée, Estimation, Fourchette, À compléter.
- Droits d'enregistrement en Wallonie : 3 % (habitation propre et unique) ou 12,5 %, à confirmer par le notaire.
- Honoraires du notaire : montant à encoder (simulation du notaire).
