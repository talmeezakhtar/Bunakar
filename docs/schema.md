# Data schema

This is the PostgreSQL schema, managed by TypeORM. The entities live in `backend/src/<module>/entities/`.

Tables are created from the entities by schema sync. That's on by default in development, and in production it needs `DB_SYNCHRONIZE=true`. Moving to migrations is on the roadmap.

```
users 1──* tile_designs
      1──* freeform_designs        (deleting a user deletes their designs)
swatches                           (catalog, referenced by id from inside the design JSON)
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
| id | uuid | PK |
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
| myStyles | jsonb `string[]` | palette swatch ids |
| overlays | jsonb | medallions and border runs placed on the tiles |
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
| createdAt, updatedAt | timestamp | |

Index: `(userId, updatedAt)`.

## Why JSON columns for the design bodies

A design is always loaded and saved as a whole, never queried by individual tile, and a large rug can hold tens of thousands of pieces. One `jsonb` row per design keeps a save to a single write. The DTOs validate every element's shape and cap the array sizes.
