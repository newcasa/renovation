# Lecture de la photo du questionnaire (Claude via Supabase)

Quand on photographie le questionnaire de visite dans l'appli, la photo est envoyée à cette fonction Supabase, qui la fait lire par Claude puis renvoie les réponses. **La clé Anthropic reste dans Supabase** : elle n'est jamais dans le site ni dans le téléphone.

Sans cette fonction (ou si elle ne répond pas), l'appli continue de marcher : elle remplit la maison avec le questionnaire d'exemple et le dit.

## Mise en route (une seule fois, environ 10 minutes)

1. **Créer la fonction**
   Supabase → ton projet → **Edge Functions** → **Deploy a new function** → **Via Editor**.
   - Nom : `lire-questionnaire` (exactement).
   - Remplace le code proposé par tout le contenu du fichier `index.ts` de ce dossier, puis **Deploy**.

2. **Laisser l'appli appeler la fonction**
   Dans la fonction → **Details** (ou **Settings**) → désactive **Verify JWT / Enforce JWT verification**, puis enregistre.
   La fonction refuse elle-même les appels qui ne viennent pas de hoono.be.

3. **Créer une clé Anthropic (si tu n'en as pas, ou si tu l'as perdue)**
   console.anthropic.com → **Settings** → **API Keys** → **Create Key** (nom : « Valou lecture photo »).
   La clé ne s'affiche qu'une seule fois : copie-la et colle-la **directement** à l'étape suivante, sans la noter ailleurs.
   Une clé perdue ne se retrouve pas : supprime l'ancienne dans la même page (**Delete** / **Disable**) et crée-en une nouvelle.
   S'il n'y a pas encore de crédit, ajoute-en dans **Billing** (quelques euros suffisent pour la démo).

4. **Mettre la clé dans Supabase**
   Supabase → **Edge Functions** → **Secrets** → **Add new secret**.
   - Nom : `ANTHROPIC_API_KEY`
   - Valeur : ta clé Anthropic (elle commence par `sk-ant-`). Ne la colle nulle part ailleurs.

5. **Fixer un plafond de dépenses**
   console.anthropic.com → **Settings** → **Limits** : mets une limite mensuelle (par exemple 10 €). Une lecture coûte environ 1 à 3 centimes.

6. **Essayer**
   Sur hoono.be/demo : une maison → **Espaces** → **📝 Photo du questionnaire** → photo → **Lire le questionnaire**.
   « ✓ Lu sur votre photo » = la lecture marche. Si l'appli affiche « questionnaire d'exemple », la raison est écrite juste à côté.

## Ce que lit la fonction

L'adresse, la commune, le prix, l'année, la surface, les étages, les façades, la largeur et la profondeur, l'état, le PEB, le chauffage existant ; pour chaque pièce : la surface du sol, sol et murs à refaire, le nombre de châssis à remplacer, les remarques ; les gros travaux cochés ; les rappels cochés. Ce qui est difficile à lire est signalé « À vérifier ».

## Réglages

- Modèle : `claude-opus-5-5`, avec repli automatique si Claude refuse une demande.
- 2 photos au plus par lecture, réduites à 2000 pixels par l'appli avant l'envoi.
- Sites autorisés : hoono.be, localhost (essais) et la page de test privée.
