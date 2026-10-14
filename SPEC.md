# PFE Application Tracker — Cahier des charges

Tu es un développeur full-stack senior. Développe une application web simple appelée **PFE Application Tracker** pour suivre des candidatures de stage PFE. Elle sera déployée en ligne et utilisée par 2 personnes (moi et une amie), chacune avec ses propres données.

**RÈGLE PRINCIPALE : privilégie la SIMPLICITÉ.** Code propre, facile à comprendre, 100 % fonctionnel. Pas de fonctionnalité non demandée. Pas de microservices, pas d'IA, pas de Kanban, pas de calendrier. Fournis des fichiers complets et directement utilisables, pas des extraits.

## Façon de travailler

- Relis ce fichier avant chaque étape.
- Travaille étape par étape (voir « Ordre de travail »).
- À chaque étape : dis ce qui a été créé, comment le tester en local, puis attends mon accord avant de continuer.
- Vérifie que le code compile et fonctionne avant de passer à la suite.
- En cas de doute, choisis la solution la plus simple.

## Stack (uniquement)

- Frontend : Angular (dernière version stable, standalone components) + TypeScript + SCSS
- Backend : Spring Boot 3 + Java 17 + Spring Data JPA + Spring Security (JWT minimal)
- Base de données : MySQL
- Extension : Chrome Manifest V3 (JavaScript simple)
- Graphiques : Chart.js (via ng2-charts) ou équivalent léger

## Structure du repo (monorepo)

```
pfe-tracker/
  backend/
  frontend/
  extension/
  README.md
  SPEC.md
```

## Authentification minimale (2 utilisateurs)

- Entité User : id, email (unique), passwordHash (BCrypt), createdAt
- POST /api/auth/register et POST /api/auth/login → renvoient un JWT
- Toutes les routes /api/applications/** exigent le JWT
- Chaque Application appartient à un User ; un utilisateur ne voit et ne modifie que ses propres candidatures
- Pas de rôles, pas d'OAuth, pas de reset de mot de passe
- Frontend : pages /login et /register, intercepteur HTTP qui ajoute le token, guard de route, bouton déconnexion
- Variable d'environnement APP_REGISTRATION_ENABLED pour fermer l'inscription une fois que nous deux sommes inscrites

## Entité Application (table principale)

id, user (ManyToOne), company, jobTitle, jobUrl, reference, platform, location, description (TEXT), importantElements (TEXT), skills, contactName, contactEmail, contactLinkedin, applicationDate, status, priority (BASSE / MOYENNE / HAUTE), screenshot (image, au plus simple), followUp1Date, followUp1Done, followUp1DoneDate, followUp2Date, followUp2Done, followUp2DoneDate, notes, createdAt, updatedAt.

Statuts (enum) : EN_ATTENTE, RELANCE_1, RELANCE_2, ENTRETIEN, OFFRE, REFUSEE, RETIREE.

## Relances (fonctionnalité essentielle)

- À la création, si applicationDate existe : followUp1Date = applicationDate + 14 jours ; followUp2Date = followUp1Date + 21 jours (calculé côté backend)
  - Exemple : candidature le 05/10/2026 → relance 1 le 19/10/2026 → relance 2 le 09/11/2026
- Les deux dates sont modifiables manuellement
- Maximum 2 relances
- PATCH /follow-up/1 ou /2 : marque la relance faite, enregistre la date réelle, passe le statut à RELANCE_1 ou RELANCE_2
- Ne jamais envoyer d'email automatiquement

## API REST

```
POST   /api/auth/register
POST   /api/auth/login

GET    /api/applications
GET    /api/applications/{id}
POST   /api/applications
PUT    /api/applications/{id}
DELETE /api/applications/{id}
PATCH  /api/applications/{id}/status
PATCH  /api/applications/{id}/follow-up/1
PATCH  /api/applications/{id}/follow-up/2
GET    /api/applications/follow-ups/today    (relances dues aujourd'hui ou en retard)
GET    /api/applications/statistics          (totaux, par statut, par plateforme, par mois)
POST   /api/applications/{id}/screenshot     (upload d'image, multipart)
GET    /api/applications/{id}/screenshot
```

- DTOs simples, validation basique, erreurs renvoyées en JSON propre
- CORS configurable par variable d'environnement (autoriser l'URL GitHub Pages et l'extension)
- Capture : stocker l'image en base (LONGBLOB) ou en fichier, au plus simple

## Frontend Angular

Pages : /login, /register, /dashboard, /applications, /applications/new, /applications/:id, /applications/:id/edit, /settings

Composants : Sidebar, Topbar, Dashboard, ApplicationTable, ApplicationForm, ApplicationDetails, FollowUpList, Statistics, StatusBadge.

- Services Angular pour l'API ; URL de l'API dans environment.ts / environment.prod.ts
- Routing en mode hash (`useHash: true`) pour que ça marche sur GitHub Pages sans configuration spéciale

### Dashboard

- Cartes en haut : Total candidatures, En attente, Entretiens, Refusées, Offres, Relances à faire
- Section « 🔴 Relances à faire aujourd'hui » : entreprise, poste, « Relance 1 aujourd'hui », bouton **Relancer** (appelle le PATCH follow-up)
- Candidatures récentes
- 3 graphiques simples : par mois, par plateforme, par statut

### Page « Mes candidatures »

Tableau : Entreprise, Poste, Date, Plateforme, Statut, Relance, Priorité. Recherche, filtre par statut, filtre par plateforme, tri par date. Clic sur une ligne → fiche complète.

### Formulaire

- Principal : Entreprise, Poste, Lien de l'offre, Référence, Date de candidature, Plateforme, Localisation
- Important : Éléments majeurs, Compétences / technologies, Description
- Contact : Nom, Email, LinkedIn
- Suivi : Statut, Priorité, Notes
- Capture : image de l'offre (bouton « 📷 Ajouter une capture » : upload ou coller depuis le presse-papiers)

### Fiche candidature

Entreprise, poste, statut, date, plateforme, référence, localisation, lien vers l'offre, éléments importants, compétences, contact, capture, relance 1, relance 2, notes.
Boutons : **Modifier**, **Supprimer** (avec confirmation), **Marquer comme relancée**, **Générer message**.

### Message de relance

Simple template côté frontend (pas d'IA), avec le poste, l'entreprise et le nom complet de l'utilisateur (champ dans /settings, stocké en localStorage). Bouton « Copier ». Isole le code dans une fonction pour pouvoir brancher une IA plus tard.

Exemple :

```
Bonjour,

Je me permets de revenir vers vous concernant ma candidature au poste de <poste> chez <entreprise>.

Je reste bien entendu disponible pour tout complément d'information.

Cordialement,
<nom complet>
```

### Badges de statut

En attente (gris/bleu), Relance 1 (orange), Relance 2 (rouge-orange), Entretien (violet), Offre (vert), Refusée (rouge), Retirée (gris foncé).

### Design

Moderne et simple, inspiré de Notion / Linear / Vercel : sidebar, cartes, tableau, badges, icônes, beaucoup d'espace blanc. Couleur principale #6366F1. Light mode + dark mode (bascule mémorisée en localStorage). Responsive desktop / tablette / mobile. Pas d'animations complexes.

## Extension Chrome (Manifest V3)

- Popup avec le bouton **« Ajouter à PFE Tracker »**
- Configuration (une seule fois) : URL de l'API + email + mot de passe → connexion, token stocké dans chrome.storage.local
- Au clic, un content script récupère : titre, entreprise, URL, localisation, description, plateforme, référence si détectable
  - Architecture générique (balises meta, og:title, titre de la page) + extracteurs simples pour LinkedIn, Indeed, Welcome to the Jungle
  - Si une info manque, ce n'est pas grave : le formulaire permet de compléter. Objectif : fiabilité et simplicité, pas un scraper universel
- Le popup affiche un petit formulaire pré-rempli et modifiable, avec la case **☑ J'ai postulé** (si cochée : applicationDate = aujourd'hui, statut = EN_ATTENTE, relances calculées)
- Capture : `chrome.tabs.captureVisibleTab` si c'est simple, envoyée via l'endpoint screenshot. Sinon, ne pas bloquer : l'ajout se fera depuis le site
- Envoi via POST /api/applications avec le JWT
- Ne pas automatiser la candidature elle-même
- Permissions minimales (activeTab, scripting, storage) + host_permissions pour l'URL de l'API
- README d'installation (chrome://extensions → mode développeur → Charger l'extension non empaquetée)

## Déploiement (prépare tout, avec instructions pas à pas dans le README)

Configuration du backend uniquement par variables d'environnement, avec des valeurs par défaut pour le développement local :
`DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `APP_REGISTRATION_ENABLED`, `PORT`.

1. Base MySQL gratuite (Aiven ou TiDB Cloud) → récupérer les infos de connexion
2. Backend sur Render (web service) avec ces variables d'environnement. Un Dockerfile minimal dans `backend/` est autorisé UNIQUEMENT pour ce déploiement
3. Frontend sur GitHub Pages : workflow GitHub Actions (`.github/workflows/deploy.yml`) qui build Angular avec le bon `base-href` et déploie à chaque push sur `main`
4. Mettre à jour `CORS_ALLOWED_ORIGINS` avec l'URL GitHub Pages
5. Note dans le README : le backend gratuit Render se met en veille, le premier appel peut prendre 30 à 50 s

Ajoute un `.gitignore` correct (pas de secrets, pas de `node_modules`, pas de `target/`). Ne mets jamais de mots de passe ni de `JWT_SECRET` dans le repo.

## Pas d'IA pour la V1

Extraction simple, suivi, relances, dashboard. Prépare le code pour ajouter plus tard : analyse des offres, score de compatibilité, extraction des compétences, génération avancée des relances.

## Ordre de travail

1. **Étape 1** : architecture du projet + README
2. **Étape 2** : backend Spring Boot + MySQL + authentification JWT
3. **Étape 3** : CRUD des candidatures + calcul des relances
4. **Étape 4** : frontend Angular (login, layout, tableau, formulaire, fiche)
5. **Étape 5** : système de relances + message de relance
6. **Étape 6** : dashboard + statistiques
7. **Étape 7** : extension Chrome
8. **Étape 8** : configuration de déploiement (variables d'environnement, GitHub Actions, README final)

Ne crée pas de fonctionnalités non demandées.
