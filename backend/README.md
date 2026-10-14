# Backend — PFE Application Tracker

API REST Spring Boot 3 (Java 17) + MySQL + JWT.

## Local

```bash
mvn spring-boot:run
```

Voir `.env.example` pour les variables.

## Render (Docker)

Le `Dockerfile` à la racine de `backend/` est utilisé par Render (Root Directory = `backend`).

Variables obligatoires en prod : `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`.

Instructions détaillées : [README racine](../README.md#déploiement-pas-à-pas).
