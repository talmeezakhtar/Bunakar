# API

Base URL: `http://localhost:3000` locally (see `backend/.env.example`). All bodies are JSON.

Send `Authorization: Bearer <accessToken>` on routes marked **auth**. Validation strips unknown fields and rejects bad values with `400`. Request bodies are capped at 5 MB.

## Auth

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/auth/register` | none | `{ email, password, name }` | `{ accessToken, user }` · `409` if the email is taken |
| POST | `/auth/login` | none | `{ email, password }` | `{ accessToken, user }` · `401` on a wrong email or password |
| GET | `/auth/me` | **auth** | none | `{ id, email, name, role }` |

- Passwords must be at least 8 characters and at most 72 UTF-8 **bytes** (bcrypt reads no further; an emoji is 4 bytes). Emails are stored in lower case.
- Two sign-ups racing for the same email: the second gets `409` too.
- Tokens expire after 7 days.
- Register and login allow 10 attempts per 15 minutes per IP and email, then return `429`.

## Catalog

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/swatches` | none | Every yarn/tile style, in seed order: `{ id, familyId, familyName, colorName, swatchColor, imageUrl, categories }` |

The catalog is seeded from `swatches.seed.ts` on boot. Styles added to the seed later are inserted, and existing rows are left alone.

A swatch `id` is its stable slug code, e.g. `solid-wine` or `wool-sage`, the same ids as `frontend/src/data/mockSwatches.ts`. Design bodies store these codes. Older clients may still send the swatch's internal uuid anywhere a `swatchId` goes; the API stores the code instead.

## Tile designs

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/tile-designs` | **auth** | Your designs, newest first, in full |
| GET | `/tile-designs?summary=1` | **auth** | Your designs, newest first, as summaries (below) |
| POST | `/tile-designs` | **auth** | Create. Body below. |
| GET | `/tile-designs/:id` | **auth** | One of your designs. `404` if it's missing **or someone else's**. |
| PUT | `/tile-designs/:id` | **auth** | Replace (send the full body) |
| DELETE | `/tile-designs/:id` | **auth** | Delete |
| GET | `/tile-designs/:id/public` | none | Read-only view for share links. The owner is never included. |

Body:

```jsonc
{
  "name": "Royal Garden",
  "widthTiles": 4, "heightTiles": 5,            // 1-200 each, 1 tile = 18"
  "orientation": "normal",                      // normal | diagonal
  "backgroundId": "light-wood",                 // light-wood | dark-wood | concrete | none
  "rugCategory": "area",                        // area | runner | wall
  "tiles": [{ "row": 0, "col": 0, "swatchId": "<id>", "cutType": "full", "rotation": 0, "slot": { "x": 0, "y": 0 } }],
  "myStyles": ["<swatchId>"],                   // the design's palette
  "overlays": [{ "id": "o1", "assetId": "s1-medallion-1", "row": 1, "col": 1, "widthTiles": 2, "heightTiles": 2, "rotation": 0 }],
  "thumbnail": "data:image/webp;base64,..."     // optional, see below
}
```

`thumbnail` is optional on create and update: a base64 webp data URL of at most 60,000 characters, drawn by the client on save. Send `null` to clear it. Leaving it out of a `PUT` keeps the stored one.

Summary (`?summary=1`), the same shape for both kinds of design:

```jsonc
{ "id": "<uuid>", "name": "Royal Garden", "kind": "tile",   // tile | freeform
  "widthFt": 6, "heightFt": 7.5,                            // tile designs: tiles × 1.5 ft
  "thumbnail": "data:image/webp;base64,..." /* or null */, "updatedAt": "2026-11-21T12:00:00.000Z" }
```

## Freeform designs

Same routes under `/freeform-designs` (including `?summary=1` and `/:id/public`), with this body:

```jsonc
{
  "name": "Sage Garden",
  "widthFt": 5, "heightFt": 8,                  // 2-30 ft each
  "rugCategory": "area",
  "backgroundId": "light-wood",
  "ground": { "swatchId": "<id>", "texture": "cut", "pile": "standard", "carve": "none", "carveAngle": 45 },
  "shapes": [{ "id": "s1", "points": [{ "x": 1, "y": 1 }], "smooth": true, "swatchId": "<id>", "texture": "loop", "pile": "high", "carve": "groove", "carveAngle": 45 }],
  "myStyles": ["<swatchId>"],
  "thumbnail": "data:image/webp;base64,..."     // optional
}
```

- `texture`: `cut | loop | shag | highlow | photo`
- `pile`: `low | standard | high`
- `carve`: `none | groove | ribbed | contour`

## Health

`GET /` returns `200`. Use it as the host's health check.
