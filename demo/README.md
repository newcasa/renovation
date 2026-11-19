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
| `js/app.js` | Les écrans : accueil, ajouter une maison, le vrai coût, comparer, dossier pour la banque (imprimable en PDF) |
| `js/vitrine.js` | Les écrans de présentation : Professionnels (artisan : demandes et mes tarifs, courtier, agence : simulations), Notre moteur, Feuille de route |
| `maison-demo.json` | **Les 2 maisons de démonstration (fictives)** : A, ancienne et à rénover, et B, plus chère mais en bon état. Elles sont affichées dès la première visite. Pour les remplacer par de vraies maisons : changer ce fichier (mêmes champs). Seules les caractéristiques et les quantités y sont, les prix viennent toujours des références |
| `js/stockage.js`, `js/format.js` | Enregistrement des maisons sur l'appareil, mise en forme des montants |
| `tests/moteur.test.mjs` | Tests du moteur : `node --test demo/tests/moteur.test.mjs` |
| `tests/parcours.mjs` | Test du parcours complet dans un navigateur, avec captures : `node demo/tests/parcours.mjs captures` |

Les prix viennent des **mêmes fichiers** que l'appli complète, et du **tableau de bord des calculs** : un prix publié là est repris ici.

## Règles du calcul

- Aucun prix inventé : un prix absent est « à compléter ».
- Un poste dont un article n'a pas encore de prix garde la fourchette Valou pour le matériel ; sans tarif de main-d'œuvre de référence, il garde la fourchette Valou pour la main-d'œuvre. Dans les deux cas, il est signalé comme « Estimation ».
- Chaque poste affiche son niveau de fiabilité : Référence détaillée, Estimation, Fourchette, À compléter.
- Droits d'enregistrement en Wallonie : 3 % (habitation propre et unique) ou 12,5 %, à confirmer par le notaire.
- Frais de notaire de l'acte d'achat : calculés d'après le simulateur notaire.be (relevés de novembre 2026, vérifiés au centime pour 150 000, 245 000 et 400 000 €). Ils sont toujours calculés par l'appli (plus de saisie du montant du notaire). Sous 64 095 € : à compléter. Les frais de l'acte de crédit ne sont pas encore comptés.

## Prix locaux des artisans (simulation)

Sur l'écran « Notre moteur », une simulation montre le fonctionnement prévu :
- les artisans encodent leurs tarifs, qui restent **confidentiels** ;
- pour un chantier, Valou prend le plus petit rayon (5, 10, 15 puis 20 km) qui compte **au moins 5 artisans** ;
- les prix anormaux sont écartés, puis bas = 1er quartile, moyen = médiane, haut = 3e quartile ;
- s'il y a moins de 5 artisans, la grille de référence est gardée.

Les tarifs des artisans y sont **fictifs** : ils sont tirés au hasard dans la fourchette de référence du poste, et ils ne changent jamais le budget des maisons. Le calcul est dans `js/moteur.js` (`prixLocaux`) et il est testé.

Pour la vraie appli, il faudra une table privée dans Supabase, où le calcul de la moyenne se fait sur le serveur et ne renvoie que des moyennes d'au moins 5 artisans. Le principe est à faire valider par un avocat (droit de la concurrence et RGPD).

## Pièces et chauffage

- **Pièces** : on encode la surface au sol de chaque pièce. Les murs sont calculés automatiquement (sol × 2,7) et restent corrigeables. Le plafond est égal au sol. Les travaux d'une pièce (sol, murs, plafond) suivent ces surfaces ; une quantité tapée à la main n'est plus recalculée.
- **Postes plafond ajoutés par le prototype** : « Plafond – plafonnage » (articles du plafonnage, tarif M13) et « Plafond – peinture » (articles de la peinture, tarif M16 des murs, signalé « Estimation »). Ils seront à ajouter au tableau de bord des calculs.
- **Chauffage** : chauffage existant, chauffage souhaité (chaudière gaz à condensation ou pompe à chaleur) et radiateurs ou chauffage au sol. Les lignes de travaux sont créées automatiquement. Les radiateurs sont comptés en « remplacement » si un chauffage existe, sinon en « nouveau raccordement ». Le démontage d'une cuve à mazout est signalé « à compléter ».

## Photos de la visite

Bouton « 📷 Photos de la visite » sur la fiche d'une maison :
- on choisit la pièce photographiée (une pièce de la maison, une pièce courante, ou un autre nom), puis on prend autant de photos qu'on veut ;
- chaque photo garde le **nom** de sa pièce et s'associe automatiquement à la pièce du même nom. Sans pièce de ce nom, un bouton la crée ;
- on peut changer la pièce d'une photo ou la supprimer ;
- dans chaque pièce, ses photos s'affichent, avec un bouton pour en ajouter.

Les photos restent sur l'appareil (IndexedDB), réduites à 1600 px. Code : `js/photos.js`.

## Avant chaque mise en ligne

- `node demo/tests/version.mjs` : met un nouveau numéro de version sur les fichiers de l'appli, pour que les téléphones chargent la nouvelle version au lieu de celle gardée en mémoire.
- `node demo/tests/pdf-questionnaire.mjs` : si le questionnaire a changé, refait le PDF A4 prêt à imprimer.
