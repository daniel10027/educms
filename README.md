# EduCMS — Système de gestion de contenu éducatif

Un CMS complet (niveau projet de master) pensé pour des établissements d'enseignement :
articles, catégories, étiquettes, commentaires modérés, médiathèque, gestion des rôles,
révisions d'articles, recherche plein texte, tableau de bord analytique.

Le projet est composé de deux applications indépendantes :

```
educms/
├── backend/    API REST Node.js / Express / PostgreSQL
├── frontend/   Panneau d'administration + site public, React / Vite
└── render.yaml Déploiement automatisé sur Render (Blueprint)
```

---

## 1. Aperçu technique

| Couche | Choix | Détails |
|---|---|---|
| API | Node.js 18+, Express 4 | REST, JWT, validation, rate limiting |
| Base de données | PostgreSQL 14+ | Schéma relationnel, recherche plein texte (`tsvector`), vues, fonctions |
| Cache (optionnel) | Redis | Désactivable — l'app fonctionne sans (`REDIS_ENABLED=false`) |
| Frontend | React 19 + Vite | SPA, React Router, design system maison |
| Auth | JWT (access + refresh) | Rotation des refresh tokens en base |
| Médias | Multer + Sharp | Upload, redimensionnement, miniatures |
| Documentation API | Swagger UI | `/api/docs` |

### Fonctionnalités couvertes

- **Authentification complète** : inscription, connexion, rafraîchissement de session, changement de mot de passe, déconnexion avec révocation de token.
- **Rôles** : `admin`, `editor`, `author`, `subscriber`, avec permissions différenciées sur chaque route.
- **Articles** : CRUD complet, slugs uniques auto-générés, statuts (brouillon/publié/archivé), extrait auto-généré, calcul du temps de lecture, mise en avant, SEO (titre/description méta), **historique des révisions avec restauration**.
- **Recherche plein texte** en français (PostgreSQL `tsvector`/`tsquery`, pondérée titre > extrait > contenu).
- **Catégories hiérarchiques** et **étiquettes**.
- **Commentaires** modérés (en attente / approuvé / indésirable / corbeille), avec auto-approbation pour le staff.
- **Médiathèque** : upload d'images et PDF, génération automatique de miniatures, copie de lien.
- **Tableau de bord** : statistiques d'articles, vues, commentaires en attente, top articles.
- **Journal d'activité** (audit trail) sur les actions sensibles.
- **Site public** : page d'accueil avec filtres par catégorie, page article avec commentaires et "j'aime".

---

## 2. Lancer le projet en local

### Prérequis

- Node.js 18 ou supérieur
- PostgreSQL 14 ou supérieur (local ou distant)
- npm 9+

### 2.1 Base de données

Créez une base PostgreSQL vide :

```bash
createdb educms_db
```

### 2.2 Backend

```bash
cd backend
cp .env.example .env
# Éditez .env : renseignez au minimum DB_* (ou DATABASE_URL) et JWT_SECRET / JWT_REFRESH_SECRET
npm install
npm run migrate   # crée toutes les tables, index, vues, triggers
npm run seed       # (optionnel) ajoute des comptes et articles de démonstration
npm run dev         # démarre l'API sur http://localhost:5000
```

Comptes créés par `npm run seed` (à usage local uniquement) :

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | admin@educms.local | Admin123! |
| Éditeur | editor@educms.local | Editor123! |
| Auteur | author@educms.local | Author123! |

L'API est documentée sur `http://localhost:5000/api/docs` et vérifiable via `http://localhost:5000/api/health`.

### 2.3 Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL doit pointer vers l'API (http://localhost:5000/api/v1 en local)
npm install
npm run dev   # démarre sur http://localhost:5173
```

Ouvrez `http://localhost:5173`. Le site public est accessible directement ; le panneau
d'administration est sur `/admin` après connexion.

---

## 3. Déploiement en production (Render)

Le fichier `render.yaml` à la racine est un **Blueprint Render** : il décrit la base de
données, le service backend et le site statique frontend en une seule fois.

### 3.1 Déploiement automatique via Blueprint

1. Poussez ce dépôt sur GitHub/GitLab.
2. Sur [render.com](https://dashboard.render.com), cliquez **New > Blueprint**.
3. Sélectionnez votre dépôt. Render détecte `render.yaml` et propose de créer :
   - `educms-db` (PostgreSQL)
   - `educms-backend` (Web Service Node)
   - `educms-frontend` (Static Site)
4. Validez. Render génère automatiquement `JWT_SECRET` et `JWT_REFRESH_SECRET`,
   relie `DATABASE_URL` à la base créée, et lance `npm run migrate && npm start`
   au premier déploiement (la migration est idempotente : elle peut être relancée
   sans risque).
5. Une fois le backend en ligne, **mettez à jour `FRONTEND_URL`** dans les variables
   d'environnement du service backend avec l'URL réelle du frontend Render
   (visible dans son tableau de bord), pour que CORS autorise les requêtes.
6. Mettez à jour `VITE_API_URL` dans le service frontend avec l'URL réelle du
   backend, puis redéployez le frontend (les variables Vite sont injectées au
   build, pas à l'exécution).
7. (Optionnel) Lancez `npm run seed` depuis le **Shell** du service backend dans
   le tableau de bord Render si vous voulez des données de démonstration.

### 3.2 Déploiement manuel (sans Blueprint)

Si vous préférez créer les services à la main :

**Base de données** : New > PostgreSQL. Notez l'`Internal Database URL`.

**Backend** (New > Web Service) :
- Root directory : `backend`
- Build command : `npm install`
- Start command : `npm run migrate && npm start`
- Variables d'environnement : copiez `.env.example`, remplacez `DATABASE_URL`
  par l'URL interne de la base, générez des secrets JWT aléatoires
  (`openssl rand -hex 32`), définissez `NODE_ENV=production` et `DB_SSL=true`.

**Frontend** (New > Static Site) :
- Root directory : `frontend`
- Build command : `npm install && npm run build`
- Publish directory : `dist`
- Variable d'environnement : `VITE_API_URL=https://<votre-backend>.onrender.com/api/v1`
- Ajoutez une règle de réécriture `/* → /index.html` (Rewrite) pour que le
  routage côté client (React Router) fonctionne sur les rechargements de page.

### 3.3 Limite importante : stockage des fichiers uploadés

Le plan **gratuit** de Render n'offre pas de disque persistant : tout fichier
déposé dans `backend/uploads` (médiathèque) est **perdu à chaque redéploiement
ou redémarrage** du service. Le `render.yaml` fourni déclare un disque
persistant (`educms-uploads`), mais les disques persistants Render nécessitent
un **plan payant** sur le service concerné.

Trois options pour la production :

1. **Passer le service backend à un plan payant** Render avec disque persistant
   (le plus simple, déjà configuré dans `render.yaml`).
2. **Brancher un stockage objet externe** (S3, Cloudflare R2, Backblaze B2) à la
   place du disque local — nécessite d'adapter `src/middleware/upload.js` et
   `src/controllers/mediaController.js` pour uploader vers le bucket au lieu du
   système de fichiers local. C'est l'option recommandée pour un usage en
   production durable.
3. **Accepter la limite** pour une démo ou un usage pédagogique à faible enjeu.

### 3.4 Variables d'environnement à ne jamais oublier en production

- `JWT_SECRET` / `JWT_REFRESH_SECRET` : générées automatiquement par Render
  (Blueprint) ou à générer vous-même (`openssl rand -hex 32`). Ne réutilisez
  jamais les valeurs de `.env.example`.
- `DB_SSL=true` : requis pour la plupart des fournisseurs PostgreSQL managés.
- `FRONTEND_URL` : doit correspondre exactement à l'origine du frontend déployé,
  sinon les requêtes seront bloquées par CORS.

---

## 4. Structure du backend

```
backend/
├── server.js                 Point d'entrée, démarrage + arrêt propre
├── src/
│   ├── app.js                Configuration Express (middlewares, routes)
│   ├── config/                database.js, redis.js, swagger.js
│   ├── controllers/           Logique métier par ressource
│   ├── middleware/            auth, validation, upload, gestion d'erreurs
│   ├── routes/                Déclaration des routes par ressource
│   ├── database/              schema.sql, migrate.js, seed.js
│   └── utils/                 logger.js, helpers.js
└── uploads/                   Fichiers médias (créé automatiquement)
```

### Principales routes API (`/api/v1`)

| Méthode | Route | Accès |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Public |
| POST | `/auth/refresh`, `/auth/logout` | Public |
| GET | `/auth/me` | Authentifié |
| GET | `/posts` | Public (articles publiés) / Staff (tous statuts) |
| GET | `/posts/:slug` | Public |
| GET | `/posts/by-id/:id` | Staff |
| POST/PUT/DELETE | `/posts`, `/posts/:id` | Auteur, Éditeur, Admin |
| GET/POST | `/posts/:id/revisions` | Staff |
| GET/POST/PUT/DELETE | `/categories` | Lecture publique, écriture Éditeur/Admin |
| GET/POST/PUT/DELETE | `/tags` | Lecture publique, écriture Staff |
| GET/POST | `/comments/post/:postId` | Lecture publique, écriture tous |
| PATCH/DELETE | `/comments/:id` | Éditeur, Admin |
| GET/POST/PUT/DELETE | `/media` | Staff |
| GET | `/users/dashboard` | Staff |
| GET/PATCH | `/users`, `/users/:id/role` | Admin |

La documentation interactive complète est disponible sur `/api/docs` une fois
le serveur démarré.

---

## 5. Structure du frontend

```
frontend/src/
├── api/            Client Axios + fonctions par ressource
├── context/         AuthContext (session, rôle, refresh automatique)
├── components/       Composants partagés (boutons, champs, ledger, sidebar…)
├── pages/             Site public (accueil, article, connexion, inscription)
└── pages/admin/       Panneau d'administration (tableau de bord, articles, …)
```

### Identité visuelle

Le panneau d'administration s'inspire d'un cabinet de bibliothèque plutôt que
d'un tableau de bord SaaS générique : papier chaud, encre, sceau terracotta
pour les statuts, registre numéroté en marge pour les listes. Tokens de design
dans `src/styles/tokens.css`.

---

## 6. Sécurité

- Mots de passe hachés avec bcrypt (10 rounds, configurable).
- JWT à courte durée de vie (7 jours) + refresh tokens (30 jours) révocables,
  stockés en base et invalidés à la déconnexion ou au changement de mot de passe.
- En-têtes de sécurité via Helmet.
- Limitation de débit (rate limiting) globale et renforcée sur les routes d'authentification.
- Validation systématique des entrées (express-validator).
- Protection contre l'injection SQL via requêtes paramétrées (`pg`).
- CORS restreint à l'origine du frontend configurée.
