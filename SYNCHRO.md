# Synchroniser Kozi entre ton téléphone et ton ordinateur

Kozi utilise **Supabase** (offre gratuite) pour les comptes et la synchronisation.
Tant que le fichier `kozi-config.json` n'existe pas, Kozi reste 100 % local, comme avant.

> 🔒 **Ne partage jamais** la clé `service_role` (secrète). La seule clé à mettre dans Kozi
> est la clé **publique** (`anon` / `publishable`) : elle est faite pour être dans une appli
> et ne donne accès qu'aux données de la personne connectée.

## 1. Créer le projet Supabase (5 minutes)
1. Va sur https://supabase.com → **Start your project** → connecte-toi (avec GitHub par exemple).
2. **New project** : nom `kozi`, région **West EU (Ireland)** ou **Central EU (Frankfurt)**,
   choisis un mot de passe de base de données (garde-le pour toi).
3. Attends que le projet soit prêt (1 à 2 minutes).

## 2. Créer les tables
1. Menu de gauche → **SQL Editor** → **New query**.
2. Copie tout le contenu du fichier `supabase/kozi.sql` de ce dépôt, colle-le, puis **Run**.
3. Tu dois voir « Success ».

## 3. Recevoir un code à 6 chiffres par e-mail
1. Menu **Authentication** → **Emails** (ou *Email Templates*) → modèle **Magic Link**.
2. Remplace le contenu par par exemple :
   ```
   <h2>Ton code Kozi</h2>
   <p>Entre ce code dans Kozi pour te connecter : <b>{{ .Token }}</b></p>
   ```
3. Enregistre. (Fais pareil pour le modèle **Confirm signup** si tu le vois.)

## 4. Brancher Kozi
1. Dans Supabase : **Project Settings** → **API** (ou *Data API*) : note
   - l'**URL du projet** (`https://xxxx.supabase.co`)
   - la clé **anon / publishable** (publique).
2. Sur GitHub, dans le dépôt `newcasa/renovation` → **Add file** → **Create new file**,
   nom : `kozi-config.json`, contenu :
   ```json
   {"url":"https://xxxx.supabase.co","key":"COLLE_ICI_LA_CLE_ANON"}
   ```
3. **Commit changes** sur la branche `main`. Une minute après, c'est en ligne.

## 5. Se connecter
Sur chaque appareil : ⚙️ **Paramètres** → **👤 Compte** → ton e-mail → **Recevoir mon code**
→ entre le code reçu → **Se connecter**. Un ☁️ apparaît en haut : tout est synchronisé.

## Bon à savoir
- **Testeurs** : ceux qui ne se connectent pas restent en local et ne voient rien de ta session ;
  chacun peut aussi créer son propre compte.
- **Limite d'e-mails** : le service d'e-mail intégré de Supabase n'envoie que quelques e-mails
  par heure (prévu pour les tests). Pour beaucoup d'utilisateurs, il faudra brancher un service
  d'envoi (Brevo, Resend…) dans *Authentication → SMTP*.
- **Conflit** : si tu as modifié les deux appareils sans connexion, Kozi te demande quelle version garder.
- **Espace gratuit** : 500 Mo de base de données, largement assez pour tester (les photos sont réduites).
