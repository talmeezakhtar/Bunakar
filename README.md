# Buनakar — Project Context & Build Brief

A carpet/rug design platform inspired by Mirzapur's carpet weaving industry, letting sellers design rugs interactively (shape, pattern, border, material) with a live preview and price estimate. Built as a two-person portfolio/resume project.

---

## 1. Confirmed Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Frontend state | `useReducer` + Context (a single `Design` state object, updated via typed actions) |
| Backend | NestJS + TypeScript |
| ORM | TypeORM (default recommendation — closest fit to Nest's decorator-based conventions; swap for Prisma if that's what you used in your internship and prefer it) |
| Database | PostgreSQL |
| Auth | NestJS Guards + JWT (Passport strategy) |
| PDF export | `pdfkit` or `puppeteer` (backend-generated spec sheet) |
| Containerization | Docker + Docker Compose (frontend, backend, PostgreSQL) |
| CI | GitHub Actions (build check on every PR) |
| Version control | Git + GitHub, trunk-based (see §6) |

**Why this stack**: React/Vite/TS, NestJS/TS, and PostgreSQL were all chosen because you already have real hands-on experience with them (React from prior work, NestJS and Postgres from an internship) — prioritizing shipping speed and confidence over learning something new mid-project. The data (designs, patterns, colors, materials) is cleanly relational and works equally well on either engine, so there was no technical reason to override real prior experience.

---

## 2. Feature List

### Phase 1 — Core designer (build this first, in full)
- Shape & size selector: rectangle, round, runner; presets (3×5, 5×8, 8×10 ft) + custom width/height
- Field: base color from a curated palette (Traditional / Pastel / Bold groupings)
- Pattern library: categorized (Geometric, Persian/floral, Medallion, Tribal, Contemporary), each pattern recolorable via named color slots, not fixed images
- Border builder: add/reorder/remove concentric border rings, each with its own width, color, pattern
- Material & pile type selector: wool/silk/jute/cotton × hand-knotted/tufted/flatweave/shag, shown as a texture swatch
- Live price estimate, recalculated as choices change
- Save + export: persist design, generate downloadable PDF spec sheet, generate shareable link

### Phase 2 — Seller business tools (build as time allows)
- Seller dashboard: catalog of designs/stock with search & filters
- Basic inventory tracking (raw material stock, finished goods, low-stock alerts)
- Order tracking (created → in production → shipped)

### Phase 3 — Market intelligence (stretch / roadmap-only if out of time)
- Etsy Open API (v3) integration for trending colors/patterns/price bands in the rugs category — use official API, cache a snapshot rather than live-polling
- "Trending now" strip on the seller dashboard

### Non-technical but high-value
- "About the Craft" page — short heritage piece on Mirzapur/Bhadohi's GI-tagged carpet industry and hand-knotting. Cheap to build, strong authenticity/interview talking point.

---

## 3. UX Principles

- Progressive disclosure: default panel order (Shape & Size → Field → Pattern → Border → Material) but every tab freely clickable, not a forced linear wizard
- Everything updates live on the SVG stage — no "Apply" button, no reload
- Price bar stays visible at all times (sticky bottom on mobile, side panel on desktop)
- Mobile controls become a bottom sheet, not a squeezed sidebar
- Don't rely on color alone to distinguish options — pair swatches with labels, make patterns visually distinct by shape too (colorblind users)
- Offer 3–4 starter presets so users never face a blank canvas
- Skeleton loaders and real empty states, not blank screens
- Snappy, restrained transitions (150–200ms) on color/pattern swaps — no decorative animation that slows interaction

---

## 4. Data Model

```
Design {
  id, sellerId,
  shape: "rectangle" | "round" | "runner",
  widthFt, heightFt,
  field: { colorId, patternId },
  borders: [ { order, widthIn, colorId, patternId } ],
  medallion: { enabled, patternId, colorId, scale },
  material: materialId,
  pileType: pileTypeId,
  priceEstimate
}
```

- `patterns`, `colors`, `materials`, `pile_types` are their own catalog tables
- Each pattern stores SVG path data with named color "slots" (primary/secondary) rather than baked-in colors — this is what makes one motif reusable across any color combination
- `designs` → `design_borders` is a proper one-to-many relation via foreign key, not a JSON blob

---

## 5. Frontend Architecture

**Rendering**: SVG, not Canvas/WebGL — a rug design is a stack of vector layers (field, borders, motifs) with swappable fill colors; SVG lets you recolor a pattern by changing a `fill` attribute and maps naturally onto React components.

**Component structure**:
```
<DesignerPage>
  <Stage>                → pure SVG render, driven entirely by Design state
  <ControlPanel>
    <ShapeSizePicker>
    <ColorPalette>
    <PatternLibrary>
    <BorderBuilder>
    <MaterialSelector>
  <PriceBar>              → derived from Design state
  <SaveExportBar>
```

`Stage` never mutates anything — it just renders whatever `Design` currently is. Every control dispatches an action (`SET_SHAPE`, `SET_FIELD_COLOR`, `ADD_BORDER`, `SET_MATERIAL`, etc.) through a reducer. This also makes undo/redo cheap later — just a history stack of `Design` states.

---

## 6. Git/GitHub Workflow (already set up)

- **Branching**: trunk-based — `main` only, no `dev` layer (removed deliberately; unnecessary overhead for a 2-person team)
- **Branch naming**: `feature/<short-description>`, `fix/<short-description>`, `chore/<short-description>`
- **Commits**: Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- **`main` ruleset**: Active enforcement, no bypass list, target = default branch. Checked: Restrict deletions, Block force pushes, Require a pull request before merging (1 approval, dismiss stale approvals on new commits, require approval of most recent reviewable push, require conversation resolution). Left off for now: linear history, signed commits, required status checks (enable once CI has run at least once), deployments.
- **Merge method**: squash merge only (repo setting: Allow merge commits unchecked)
- **PR template**: `.github/PULL_REQUEST_TEMPLATE.md` — What this does / How to test it / Screenshots
- **CI**: `.github/workflows/ci.yml` — separate frontend (`npm install && npm run build`) and backend (`npm install && npm run build`) jobs; backend build step actually does something now that it's NestJS (`nest build`), unlike the earlier plain-Express version
- **Project board**: 4 columns — Backlog, In Progress, In Review, Done — 10 initial issues already created and loaded

---

## 7. Team & Module Ownership

- **Frontend & Designer Experience**: React app, SVG designer engine, control panels, price bar, mobile layout, "About the Craft" page
- **Backend & Data**: NestJS modules, MySQL schema/TypeORM entities, catalog data, auth, PDF export, Docker/CI
- Both review each other's PRs regardless of module, to stay credible on the whole stack in interviews, not just "your half"

---

## 8. File Structure

```
bunakar/
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       └── ci.yml
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── designer/
│   │   │   │   ├── Stage.tsx
│   │   │   │   ├── ControlPanel/
│   │   │   │   │   ├── ShapeSizePicker.tsx
│   │   │   │   │   ├── ColorPalette.tsx
│   │   │   │   │   ├── PatternLibrary.tsx
│   │   │   │   │   ├── BorderBuilder.tsx
│   │   │   │   │   └── MaterialSelector.tsx
│   │   │   │   ├── PriceBar.tsx
│   │   │   │   └── SaveExportBar.tsx
│   │   │   ├── catalog/
│   │   │   ├── dashboard/
│   │   │   └── common/
│   │   ├── hooks/
│   │   ├── store/               # reducer + context, typed actions
│   │   ├── pages/
│   │   ├── services/             # typed API client
│   │   ├── types/                 # shared TS types (Design, Pattern, etc.)
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── designs/
│   │   │   ├── designs.module.ts
│   │   │   ├── designs.controller.ts
│   │   │   ├── designs.service.ts
│   │   │   └── entities/design.entity.ts
│   │   ├── patterns/
│   │   ├── colors/
│   │   ├── materials/
│   │   ├── auth/
│   │   ├── common/                # shared decorators, pipes, filters
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
├── docs/
│   ├── schema.md
│   └── api.md
├── docker-compose.yml
├── .gitignore
└── README.md
```

NestJS organizes by domain module (`designs/`, `patterns/`, etc.) rather than by technical layer (`controllers/`, `services/`) — each module owns its own controller, service, and entity together.

---

## 9. Status as of this brief

**Done**: repo created, collaborator accepted, `main` ruleset active, `dev` branch removed, project board with 4 columns, 10 issues created, scaffold PR (folders/.gitignore/PR template/CI) merged.

**Also done**: ORM confirmed as TypeORM. `backend/` regenerated via Nest CLI, structured by domain module (`designs`, `patterns`, `colors`, `materials`, `auth`, `common`) with TypeORM entities matching §4 and a PostgreSQL connection wired through `@nestjs/config`. JWT auth (register/login, `JwtAuthGuard`) is in place and guards the write paths. `designs.service.ts` computes `priceEstimate` server-side (`pricing.ts`) and `GET /designs/:id/pdf` streams a `pdfkit`-generated spec sheet. `frontend/` has Tailwind wired in, an SVG `Stage` (not Canvas), the `useReducer` + Context `Design` store, and the full `ControlPanel` (Shape/Size, Field, Pattern, Border, Material) plus `PriceBar` and `SaveExportBar`. Docker Compose now runs all three services (frontend/backend/postgres); CI builds both. Neither has been run against a live Postgres yet — no Docker available in the environment that built this — so the DB-backed paths (register/login, save design, list/get design, PDF export) are unverified beyond passing type-checks and the app booting and retrying the DB connection correctly.

**Next real steps**: run `docker compose up` (or point `DATABASE_URL` at a real Postgres) and smoke-test register → login → save a design → fetch its PDF end-to-end; seed the `colors`/`patterns`/`materials`/`pile_types` catalog tables (currently empty, so the designer UI has nothing to pick from); then `feature/shape-size-picker` polish and `feature/design-schema` review as the first two feature branches.