# Frontend — PFE Application Tracker

Angular 19 (standalone) + TypeScript + SCSS.

## Lancer

Prérequis : backend sur `http://localhost:8080`.

```bash
cd frontend
npm start
```

Ouvrir : [http://localhost:4200](http://localhost:4200)  
Routing en mode hash (`/#/login`, `/#/applications`, …).

## Pages (étape 4)

| Route | Description |
|-------|-------------|
| `/login`, `/register` | Auth |
| `/dashboard` | Stats, relances, récents, graphiques |
| `/applications` | Tableau + filtres |
| `/applications/new` | Formulaire création |
| `/applications/:id` | Fiche |
| `/applications/:id/edit` | Formulaire édition |
| `/settings` | Nom complet + thème |

## Config

- API locale : `src/environments/environment.ts`
- API prod : `environment.prod.ts` (`__API_URL__` injecté par GitHub Actions via le secret `API_URL`)
- Thème clair/sombre mémorisé en `localStorage`
- JWT envoyé via intercepteur HTTP

Déploiement GitHub Pages : voir le README racine + `.github/workflows/deploy.yml`.
