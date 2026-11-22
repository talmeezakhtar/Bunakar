# Data schema

This is the PostgreSQL schema, managed by TypeORM. The entities live in `backend/src/<module>/entities/`.

The schema is built by TypeORM migrations in `backend/src/migrations/`. The app runs any pending ones on boot (`migrationsRun`), so a fresh database gets the full schema on first start. Schema sync is off everywhere except tests (`NODE_ENV=test`).

- `Baseline`: the schema as schema sync left it. On a database that sync already built (a `users` table exists), it does nothing and is only recorded as run.
- `SwatchCodesAndThumbnails`: adds `swatches.code` and fills it from the seed (matched on familyId + colorName). It rewrites every swatch uuid stored inside the design JSON to that code, and adds the `thumbnail` columns.

After changing an entity, run these in `backend/`, with `DATABASE_URL` pointing at a database that is up to date:

```bash
npm run migration:generate -- src/migrations/DescribeTheChange
npm run migration:run
```

`npm run migration:revert` undoes the last one.

```
users 1──* tile_designs
      1──* freeform_designs        (deleting a user deletes their designs)
swatches                           (catalog, referenced by code from inside the design JSON)
```

## `users`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| email | varchar | unique, stored lower-case |
| passwordHash | varchar | bcrypt, 10 rounds |
| name | varchar | |
| role | enum | `seller` (default) |
| createdAt | timestamp | |

## `swatches`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, internal only |
| code | varchar | unique slug such as `solid-wine`, served as the swatch's `id` |
| familyId, familyName | varchar | a style family, e.g. "Tufted Wool" |
| colorName | varchar | |
| swatchColor | varchar | hex average colour, also used as the fallback fill |
| imageUrl | varchar, nullable | top-view photo of one tile |
| categories | jsonb `string[]` | filter tags in the style browser |

## `tile_designs`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| userId | uuid | FK → users, `ON DELETE CASCADE` |
| name | varchar | |
| widthTiles, heightTiles | int | 1–200 |
| orientation | enum | `normal`, `diagonal` |
| rugCategory | enum | `area`, `runner`, `wall`, which room photos it previews in |
| backgroundId | varchar | the floor shown under the rug |
| tiles | jsonb | `{ row, col, swatchId, cutType, rotation, slot? }[]` |
| myStyles | jsonb `string[]` | palette swatch codes |
| overlays | jsonb | medallions and border runs placed on the tiles |
| thumbnail | text, nullable | small webp data URL for design lists |
| createdAt, updatedAt | timestamp | |

Index: `(userId, updatedAt)`, which serves "my designs, newest first".

## `freeform_designs`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| userId | uuid | FK → users, `ON DELETE CASCADE` |
| name | varchar | |
| widthFt, heightFt | float | 2–30 |
| rugCategory | enum | as above |
| backgroundId | varchar | |
| ground | jsonb | the rug's base surface: `{ swatchId, texture, pile, carve, carveAngle }` |
| shapes | jsonb | polygons in feet, back to front, each with its own surface finish |
| myStyles | jsonb `string[]` | |
| thumbnail | text, nullable | as above |
| createdAt, updatedAt | timestamp | |

Index: `(userId, updatedAt)`.

## Why JSON columns for the design bodies

A design is always loaded and saved as a whole, never queried by individual tile, and a large rug can hold tens of thousands of pieces. One `jsonb` row per design keeps a save to a single write. The DTOs validate every element's shape and cap the array sizes.
