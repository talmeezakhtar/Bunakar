# Buनakar: design your own handwoven rug

![Bunakar: design your own handwoven rug](frontend/public/og-image.jpg)

Bunakar is a full-stack rug design studio inspired by the GI-tagged hand-knotted carpet tradition of Mirzapur and Bhadohi. You design a rug from modular tiles or draw one freehand, see it laid out in a real room photo, and share it with a link.

**Live demo:** _add the deployed URL here_

**Stack:** React 19, TypeScript, Vite, Tailwind CSS · NestJS 11, TypeORM, PostgreSQL · JWT auth · Docker · GitHub Actions

---

## Features

**Tile designer.** You build a rug on a grid of 18" tiles.
- Paint, drag-drop or replace pieces in 10 cut shapes (half, quad, diagonal, arc and others), with rotation.
- Lay medallions and borders on top. "Frame" wraps a border around the whole rug in one click.
- Start from 23 pattern templates in 5 colourways, or from a blank canvas.
- A live price estimate in ₹ updates as you design.

**Freeform designer.** You draw a hand-tufted rug as vector shapes.
- Tools: select, paint, draw (curved or straight pen) and stamp, from a library of 18 shapes.
- 5 generators (cobblestone, mosaic, colour-field and more) give you a seeded starting layout.
- Each surface has its own pile texture, pile height and carving (groove, ribbed, contour).
- Exports a full-scale **tufting template** (SVG) with a yarn legend for the workshop.

**Both designers**
- Undo/redo with keyboard shortcuts. A prompt before you leave with unsaved changes, whether you navigate away, log out or close the tab.
- **Room preview:** the rug is drawn into real room photos in perspective, using the room's own lighting.
- **Download** the rug as a high-resolution PNG.
- **Share** a read-only link anyone can open, no account needed.
- **My Designs:** a gallery of every saved rug.

## Engineering highlights

- **One renderer, many views.** The designer canvas, thumbnails, the room preview and the PNG export all draw from the same pure SVG render functions, so they can't drift apart.
- **Undo/redo stays cheap.** State changes go through a typed reducer, and one drag counts as one undo step. Unsaved changes are detected by comparing object references, so undoing back to the saved version counts as clean.
- **Room preview in perspective.** A homography maps the flat rug onto the floor in each room photo, and a shading map taken from the photo carries the room's light across the rug.
- **Security**
  - JWT auth, bcrypt (rejecting passwords over 72 bytes instead of silently truncating them) and a login/register rate limit.
  - Every write checks ownership. Shared links use a separate read-only route that never exposes the owner.
  - Strict input validation with size limits on every array.
  - A Content Security Policy and security headers on both the site and the API.
  - CORS refuses to start wide open in production.
- **Performance**
  - Pages are code-split, and the below-the-fold home section loads after first paint (initial JS −18%).
  - The hero image is WebP with high fetch priority.
  - API responses are compressed (about 4× smaller).
  - A composite `(userId, updatedAt)` index serves every "my designs" query.
- **Fail loudly on misconfiguration.** The server won't start without `JWT_SECRET`, or without `CORS_ORIGIN` in production, and the frontend build won't run without `VITE_API_URL`.

## Project structure

```
backend/src/
  auth/              register, login, JWT strategy, login throttle
  swatches/          yarn/tile catalog, seeded on boot
  tile-designs/      CRUD + public read-only share route
  freeform-designs/  CRUD + public read-only share route
frontend/src/
  pages/             Home, Designer, Freeform, Room preview, My Designs, Auth
  components/        tileDesigner/, freeform/, home/, common/
  store/             reducers, undo/redo history
  utils/             geometry, perspective, pricing, production template
  data/              pattern templates, generators, room photos
```

The API is documented in [docs/api.md](docs/api.md) and the database in [docs/schema.md](docs/schema.md).

## Run it locally

**With Docker (everything in one go):**

```bash
cp .env.example .env    # then set POSTGRES_PASSWORD and JWT_SECRET
docker compose up --build
```

The site runs at http://localhost:5173 and the API at http://localhost:3000.

**Without Docker** (needs Node 20+ and a local PostgreSQL):

```bash
cd backend  && cp .env.example .env && npm install && npm run start:dev
cd frontend && cp .env.example .env && npm install && npm run dev
```

**Checks** (the same ones CI runs on every PR):

```bash
cd backend  && npm run lint && npm test && npm run build
cd frontend && npm run lint && npm run build
npx tsx src/store/freeform.check.ts    # frontend self-checks; one per *.check.ts file
```

## Deploy

| Service | Settings |
|---|---|
| **API** (e.g. Render): root `backend`, build `npm ci && npm run build`, start `npm run start:prod` | `DATABASE_URL` (with `?sslmode=require`), `JWT_SECRET`, `NODE_ENV=production`, `DB_SYNCHRONIZE=true`, `CORS_ORIGIN=<site URL>` |
| **Site** (e.g. Vercel): root `frontend` | `VITE_API_URL=<API URL>`. Security headers and SPA routing come from `vercel.json`. |
| **Database** (e.g. Neon) | Any PostgreSQL 14+ |

## Roadmap

- TypeORM migrations instead of schema sync
- Login token in an httpOnly cookie (CSRF-protected) instead of `localStorage`
- A seller dashboard with orders and inventory, and real workshop pricing
