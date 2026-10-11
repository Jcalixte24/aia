# Brancher l'espace admin (10 minutes, gratuit)

L'espace admin (`/admin`) enregistre le contenu dans une base **Firebase Realtime Database**.
Le site public lit cette base à chaque visite : une modification faite dans l'admin est visible
en quelques secondes, **sans redéploiement**.

Tant que ces étapes ne sont pas faites, `/admin` tourne en **mode démo** : tout reste dans le
navigateur de la personne qui modifie et les visiteurs ne voient rien.

## 1. Créer le projet
1. Va sur https://console.firebase.google.com et connecte-toi avec un compte Google de l'association.
2. **Ajouter un projet** → nom : `aia-ci` → désactive Google Analytics → **Créer**.

## 2. Créer la base de données
1. Menu **Build → Realtime Database → Créer une base de données**.
2. Emplacement : **Belgique (europe-west1)**. Mode : **verrouillé** (on met les règles à l'étape 4).
3. Copie l'adresse en haut de l'onglet « Données », par exemple  
   `https://aia-ci-default-rtdb.europe-west1.firebasedatabase.app`

## 3. Activer la connexion par e-mail
1. **Build → Authentication → Commencer → Adresse e-mail/Mot de passe → Activer → Enregistrer.**
2. Onglet **Paramètres → Actions de l'utilisateur** : **décoche « Autoriser la création de comptes »**
   (sinon n'importe qui pourrait s'inscrire).
3. Onglet **Utilisateurs → Ajouter un utilisateur** : crée un compte par membre du bureau
   (e-mail + mot de passe). Note l'**UID** de chaque utilisateur (colonne « UID utilisateur »).

## 4. Poser les règles de sécurité
Realtime Database → onglet **Règles** → remplace tout par :

```json
{
  "rules": {
    "cms": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).val() === true"
    },
    "admins": { ".read": false, ".write": false }
  }
}
```

→ **Publier**. Le contenu est lisible par tous (c'est le site public), mais **seuls les UID listés
dans `admins`** peuvent écrire.

## 5. Déclarer les administrateurs
Realtime Database → onglet **Données** → survole la racine → **+** :
- nom : `admins`
- ajoute pour chaque membre autorisé un enfant `<UID>` = `true` (booléen).

Exemple : `admins` → `Xk3...abc` : `true`.

## 6. Donner les clés au site
Paramètres du projet (roue dentée) → **Général → Vos applications → </> (Web)** → enregistre une
application « site AIA » → copie `apiKey`. Ouvre `cms-config.js` et remplis :

```js
window.AIA_CMS = {
  databaseURL: "https://aia-ci-default-rtdb.europe-west1.firebasedatabase.app",
  apiKey: "AIzaSy..."
};
```

Ces deux valeurs ne sont **pas secrètes** (elles sont visibles dans le navigateur) : la sécurité
vient des règles de l'étape 4. Enregistre, puis `git add -A && git commit && git push` : Vercel
redéploie.

## 7. Premier lancement
1. Ouvre `https://aia-ci.cloud/admin` (ou l'adresse Vercel + `/admin`) et connecte-toi.
2. Sur le tableau de bord, clique **« Importer le contenu actuel du site »** : les 8 événements,
   12 articles et 6 membres actuels deviennent modifiables.
3. À partir de là, tout se gère depuis l'admin.

## Utilisation au quotidien
| Je veux… | Où |
|---|---|
| Annoncer une observation ou une conférence | **Événements → Nouvel événement** (date à venir : elle s'affiche dans « Prochaines missions » avec un compte à rebours) |
| Publier un article | **Articles → Nouvel article** |
| Ajouter un membre ou changer l'ordre | **Équipe** |
| Changer le téléphone, ajouter Instagram/YouTube, afficher une annonce | **Réglages** |
| Faire une copie de sécurité | **Tableau de bord → Télécharger la sauvegarde** |

Un événement passe tout seul de « Prochaines missions » à « Missions accomplies » le lendemain de sa
date de fin.

## En cas de problème
- **« Ton compte n'a pas le droit de modifier le site »** : l'UID n'est pas dans `admins` (étape 5).
- **« Impossible de lire la base »** : l'adresse `databaseURL` est fausse ou la base n'existe pas.
- **Connexion impossible** : vérifie `apiKey`, et que « Adresse e-mail/Mot de passe » est activé.
- Mot de passe oublié : Authentication → Utilisateurs → ⋮ → **Réinitialiser le mot de passe**.
- Gratuit : le forfait « Spark » de Firebase suffit largement (1 Go de données, 10 Go/mois de transfert).
