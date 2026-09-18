# API

Base URL: `http://localhost:3000` (see `backend/.env.example`).

## Auth

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | — | `{ email, password, name }` | Returns `{ accessToken, user }` |
| POST | `/auth/login` | — | `{ email, password }` | Returns `{ accessToken, user }` |

Send `Authorization: Bearer <accessToken>` on guarded routes below.

## Catalog (read-only for buyers, POST for seeding/admin)

| Method | Path | Auth |
|---|---|---|
| GET | `/colors` | — |
| GET | `/colors/:id` | — |
| POST | `/colors` | required (any authenticated user — tighten to admin-role-only before launch) |
| GET | `/patterns` | — |
| GET | `/patterns/:id` | — |
| POST | `/patterns` | required (same caveat) |
| GET | `/materials` | — |
| GET | `/materials/:id` | — |
| GET | `/pile-types` | — |
| GET | `/pile-types/:id` | — |

## Designs

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/designs` | required | Computes `priceEstimate` server-side, persists `sellerId` from the JWT |
| GET | `/designs` | required | Lists the current seller's designs |
| GET | `/designs/:id` | — | Public — this is the shareable-link endpoint |
| GET | `/designs/:id/pdf` | — | Streams a generated PDF spec sheet |

## Not yet built

Seller dashboard, inventory, and order-tracking endpoints (Phase 2) and the Etsy trend-snapshot endpoint (Phase 3) are not implemented yet — see `README.md` §2.
