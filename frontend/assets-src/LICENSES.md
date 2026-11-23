# Third-party 3D assets

Raw source files live in `assets-src/models/` (git-ignored: they are large and some may not be
redistributed). The 3D rooms are built in code (`src/three/rooms/kit.tsx`). The courtyard uses the
four models below, credited on the credits page (`src/pages/CreditsPage.tsx`, linked from the footer).

| Published file | Source | Author | Licence |
|---|---|---|---|
| `public/models/palm.glb` (raw: `Bunakar-upgrade-plan.glb`) | [Palm Tree Realistic](https://sketchfab.com/3d-models/palm-tree-realistic-ced3b31f14f940d0b7480a83e6f8c9c0) | 00amza | CC BY 4.0 |
| `public/models/hanging-lamps.glb` | [Arabian Hanging Lamps](https://sketchfab.com/3d-models/arabian-hanging-lamps-c8eafb62343b4d258f0480af923f3e91) | cha | CC BY 4.0 |
| `public/models/lounge-props.glb` (pillows, chairs, sofa, tables, lanterns, candles, plants only) | [Arabian Lounge](https://sketchfab.com/3d-models/arabian-lounge-0d41f477dded458998f23d67372c7391) | Vinnie D'Cruz | CC BY 4.0 |
| `public/models/oil-lamp.glb` | [Arabian Oil Lamp](https://sketchfab.com/3d-models/arabian-oil-lamp-007504cbe0c94042b191021ec41bc246) | rhcreations | CC BY 4.0 |

Not usable: `ottoman_ud.glb` ([Ottoman Ud](https://sketchfab.com/3d-models/ottoman-ud-b6efaa71d12d4c7bb16b90a78de27daa) by yakuphan)
is CC BY-NC 4.0, non-commercial only. Keep it out of `public/`.

To publish another model, make a web-ready copy with `@gltf-transform/cli optimize --compress meshopt
--texture-compress webp --texture-size 1024`, put it in `public/models/`, and credit it where it is shown.

Other raw files, not published:

| Raw file | Source | Author | Licence |
|---|---|---|---|
| vintage living room | [Sketchfab](https://sketchfab.com/3d-models/vintage-living-room-3ac5d18326e24a1ab47279466e4e00ad) | [QuarizonStudio](https://sketchfab.com/QuarizonStudio) | CC BY 4.0 (credit needed if shown) |
| OPEN-ROOM-204 | [Sketchfab](https://sketchfab.com/3d-models/open-room-204-abb41159e6874b9eb5f7786633c781c1) | [sugaa](https://sketchfab.com/sugaa) | CC BY 4.0 (credit needed if shown) |
| `loft_16_interior.glb` | [Sketchfab](https://sketchfab.com/3d-models/loft-16-interior-6fcba30b42d94581b068b448b6da85a2) | dasy444 | Sketchfab Standard: never serve the file on a public site |

## Pictures

`public/rugs/rug-1..7.jpg` are the owner's own rug photos. Everything in `public/textures/`
(`pillow-kilim`, `pouf-leather`, `vase-enamel`, `yarn`, `stone`, `paving`, `rocks`, `jute`,
`bolster`, `brass`, `warp`, `pile`, `velvet`, `drape`, `blockprint`, `bougainvillea.png`,
`hanging-plant.png`) is cropped from reference pictures the owner supplied in
`assets-src/rugs/`; confirm the right to publish them before launch, or replace them
with your own photos of the same things.
