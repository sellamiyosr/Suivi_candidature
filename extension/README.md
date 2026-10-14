# Extension Chrome — PFE Application Tracker

Extension Manifest V3 pour ajouter une offre à PFE Tracker depuis LinkedIn, Indeed, Welcome to the Jungle (et pages génériques).

## Installation

1. Ouvrir Chrome → `chrome://extensions`
2. Activer **Mode développeur** (en haut à droite)
3. Cliquer **Charger l’extension non empaquetée**
4. Sélectionner le dossier `extension/` de ce repo

## Configuration (une seule fois)

1. Démarrer le backend (`cd backend` → `mvn spring-boot:run`)
2. Créer un compte via le site (`/#/register`) ou vérifier qu’il existe
3. Cliquer sur l’icône de l’extension
4. Renseigner :
   - **URL de l’API** : `http://localhost:8080/api` (sans slash final)
   - **Email** / **Mot de passe** du même compte
5. **Se connecter** — le JWT est stocké dans `chrome.storage.local`

Pour reconfigurer : bouton ⚙ en haut à droite du popup.

### Si « Connexion impossible » / API injoignable

1. Recharger l’extension sur `chrome://extensions` (bouton 🔄) après toute modification du dossier `extension/` (sinon localisation / description / référence peuvent rester vides)
2. Vérifier que `http://localhost:8080/api/auth/login` répond (backend démarré)
3. URL exacte : `http://localhost:8080/api` (pas seulement `http://localhost:8080`)
4. Utiliser le **même email/mot de passe** que sur le site (sinon : « Email ou mot de passe incorrect »)
5. Alternative : `http://127.0.0.1:8080/api`

## Utilisation

1. Ouvrir une page d’offre
2. Cliquer sur l’extension → **Ajouter à PFE Tracker**
3. Vérifier / compléter le formulaire
4. Cocher **☑ J'ai postulé** si besoin (date du jour + statut EN_ATTENTE + relances calculées côté API)
5. **Enregistrer**

La capture d’écran de l’onglet est tentée automatiquement ; si elle échoue, la candidature est quand même créée.

## Permissions

- `activeTab` / `scripting` : lire la page d’offre active
- `storage` : token + config
- `host_permissions` : appeler l’API (`localhost:8080` et HTTPS)

## Limites

Extraction simple et best-effort — pas un scraper universel. Compléter le formulaire si un champ manque.
