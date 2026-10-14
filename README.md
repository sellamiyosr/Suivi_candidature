# PFE Application Tracker

Application web simple pour suivre des candidatures de stage PFE. Conçue pour 2 utilisatrices, chacune avec ses propres données.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | Angular 19 (standalone) + TypeScript + SCSS |
| Backend | Spring Boot 3 + Java 17 + Spring Data JPA + Spring Security (JWT) |
| Base de données | MySQL |
| Extension | Chrome Manifest V3 |
| Graphiques | Chart.js |

## Structure

```
Suivi_candidature/
├── backend/                 # API Spring Boot (+ Dockerfile Render)
├── frontend/                # App Angular
├── extension/               # Extension Chrome
├── .github/workflows/       # Déploiement GitHub Pages
├── SPEC.md
└── README.md
```

## Architecture

```
Extension Chrome  ──JWT──▶  Spring Boot (Render)  ──▶  MySQL (Aiven / TiDB)
Frontend Angular  ──JWT──▶         ▲
(GitHub Pages)                     │
                            variables d'environnement
```

## Développement local

### Prérequis

- Java 17+, Maven 3.9+
- Node.js 20+, npm
- MySQL 8+ (ex. Laragon)
- Chrome (extension)

### Backend

```bash
cd backend
mvn spring-boot:run
```

API : `http://localhost:8080`  
Variables (optionnelles en local) : voir `backend/.env.example`.

### Frontend

```bash
cd frontend
npm install
npm start
```

App : `http://localhost:4200` (routing hash : `/#/login`, …).

### Extension

Voir `extension/README.md` : `chrome://extensions` → Mode développeur → Charger l’extension non empaquetée → dossier `extension/`.

---

## Déploiement (pas à pas)

### 1. Base MySQL gratuite

Choisir **Aiven** ou **TiDB Cloud** (ou équivalent) :

1. Créer un service MySQL
2. Noter : host, port, database, user, password
3. Construire l’URL JDBC, par exemple :

```text
jdbc:mysql://HOST:PORT/DB_NAME?sslMode=REQUIRED&serverTimezone=UTC
```

(Ajuster les paramètres SSL selon le fournisseur.)

### 2. Backend sur Render

1. Pousser ce repo sur GitHub
2. [Render](https://render.com) → **New** → **Web Service** → connecter le repo
3. Réglages :
   - **Root Directory** : `backend`
   - **Runtime** : Docker (utilise `backend/Dockerfile`)
   - **Instance** : Free
4. **Environment** (variables) :

| Variable | Exemple / valeur |
|----------|------------------|
| `DB_URL` | URL JDBC MySQL cloud |
| `DB_USER` | utilisateur DB |
| `DB_PASSWORD` | mot de passe DB |
| `JWT_SECRET` | chaîne aléatoire **≥ 32 caractères** |
| `CORS_ALLOWED_ORIGINS` | `https://VOTRE_USER.github.io` (à mettre à jour après le front) |
| `APP_REGISTRATION_ENABLED` | `true` puis `false` après les 2 inscriptions |
| `PORT` | `8080` (Render injecte souvent `PORT` automatiquement) |

5. Déployer → noter l’URL, ex. `https://pfe-tracker-xxxx.onrender.com`

> **Note :** sur le plan gratuit, Render met le service en veille. Le **premier appel** après inactivité peut prendre **30 à 50 secondes**.

### 3. Frontend sur GitHub Pages

1. Dans le repo GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Créer le secret **`API_URL`** = URL Render **avec** `/api`  
   Ex. `https://pfe-tracker-xxxx.onrender.com/api`
3. **Settings** → **Pages** → Source : branche **`gh-pages`** / dossier `/` (créée au premier déploiement)
4. Pousser sur `main` (ou lancer le workflow *Deploy frontend to GitHub Pages* manuellement)

Le workflow `.github/workflows/deploy.yml` :

- injecte `API_URL` dans `environment.prod.ts`
- build Angular avec `--base-href=/NOM_DU_REPO/`
- publie sur la branche `gh-pages`

URL du site : `https://VOTRE_USER.github.io/NOM_DU_REPO/`  
(ex. `https://sellamiyosr.github.io/Suivi_candidature/#/login`)

### 4. Mettre à jour CORS

Sur Render, mettre à jour :

```text
CORS_ALLOWED_ORIGINS=https://VOTRE_USER.github.io
```

(Pas de chemin `/NOM_DU_REPO` : l’origine CORS est le host uniquement.)

Redéployer le backend si besoin.

### 5. Extension en production

Dans la config de l’extension :

- **URL API** : la même que `API_URL` (ex. `https://….onrender.com/api`)
- Email / mot de passe du compte

### 6. Fermer les inscriptions

Quand vous êtes les 2 inscrites :

```text
APP_REGISTRATION_ENABLED=false
```

---

## Variables d’environnement (backend)

| Variable | Rôle | Défaut local |
|----------|------|--------------|
| `DB_URL` | JDBC MySQL | `jdbc:mysql://localhost:3306/pfe_tracker?...` |
| `DB_USER` | Utilisateur DB | `root` |
| `DB_PASSWORD` | Mot de passe DB | `root` |
| `JWT_SECRET` | Signature JWT (≥ 32 car.) | secret de dev |
| `CORS_ALLOWED_ORIGINS` | Origines front (séparées par `,`) | `http://localhost:4200` |
| `APP_REGISTRATION_ENABLED` | Autoriser `/register` | `true` |
| `PORT` | Port HTTP | `8080` |

Ne jamais committer de secrets (`.gitignore` ignore `.env`, `node_modules`, `target/`, etc.).

## Fonctionnalités V1

- Auth JWT (2 comptes, isolation des données)
- CRUD candidatures + captures
- Relances auto (+14 j / +21 j) + marquage + message template
- Dashboard (cartes, relances du jour, récents, graphiques)
- Extension Chrome (extraction LinkedIn / Indeed / WTTJ)

Pas d’IA en V1 (préparé pour plus tard).

## Licence

Usage personnel (PFE).
