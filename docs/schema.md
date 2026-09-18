# Data schema

PostgreSQL via TypeORM. Entities live under `backend/src/<module>/entities/`.

## Catalog tables

- **colors** (`colors` module) — `id, name, hex, group (traditional|pastel|bold)`
- **patterns** (`patterns` module) — `id, name, category (geometric|persian_floral|medallion|tribal|contemporary), svgPath, colorSlots (jsonb string[])`
  SVG path data uses named color slots (e.g. `primary`, `secondary`) rather than baked-in colors, so one motif is reusable across any color combination.
- **materials** (`materials` module) — `id, name (wool|silk|jute|cotton), textureSwatchUrl`
- **pile_types** (`materials` module) — `id, name (hand_knotted|tufted|flatweave|shag), textureSwatchUrl`

## Users

- **users** (`auth` module) — `id, email, passwordHash, name, role (seller|admin), createdAt`

## Designs

- **designs** (`designs` module) — `id, sellerId (FK users), shape (rectangle|round|runner), widthFt, heightFt, fieldColorId (FK colors), fieldPatternId (FK patterns), medallionEnabled, medallionPatternId (FK patterns, nullable), medallionColorId (FK colors, nullable), medallionScale, materialId (FK materials), pileTypeId (FK pile_types), priceEstimate, createdAt, updatedAt`
- **design_borders** (`designs` module) — one-to-many via `designId` FK, not a JSON blob: `id, designId, order, widthIn, colorId (FK colors), patternId (FK patterns)`

Price estimate is computed server-side in `backend/src/designs/pricing.ts` from area, material rate/sqft, pile-type multiplier, border count, and medallion flag — the frontend mirrors the same formula in `frontend/src/utils/pricing.ts` for a live preview, but the backend value returned on save is the source of truth.
