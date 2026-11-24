import { BadRequestException } from '@nestjs/common';

/** Swaps every swatch id stored inside a design body. Used to turn legacy swatch uuids into
 * codes, both in the data migration and on every write (clients may still send uuids). */
export type SwatchIdMap = (id: string) => string;

interface WithSwatch {
  swatchId: string;
}

export interface TileSwatchFields {
  tiles?: WithSwatch[];
  myStyles?: string[];
}

export interface FreeformSwatchFields {
  ground?: WithSwatch;
  shapes?: WithSwatch[];
  myStyles?: string[];
}

const withId = <T extends WithSwatch>(item: T, map: SwatchIdMap): T => ({
  ...item,
  swatchId: map(item.swatchId),
});

export function mapTileSwatchIds<T extends TileSwatchFields>(
  design: T,
  map: SwatchIdMap,
): T {
  return {
    ...design,
    ...(design.tiles && { tiles: design.tiles.map((t) => withId(t, map)) }),
    ...(design.myStyles && { myStyles: design.myStyles.map(map) }),
  };
}

export function mapFreeformSwatchIds<T extends FreeformSwatchFields>(
  design: T,
  map: SwatchIdMap,
): T {
  return {
    ...design,
    ...(design.ground && { ground: withId(design.ground, map) }),
    ...(design.shapes && { shapes: design.shapes.map((s) => withId(s, map)) }),
    ...(design.myStyles && { myStyles: design.myStyles.map(map) }),
  };
}

interface DocLayer {
  kind?: string;
  tiles?: Record<string, WithSwatch[]>;
  ground?: WithSwatch | null;
  shapes?: WithSwatch[];
}

/** Every swatch id inside a studio rug document: the palette, tile layers and shape layers. */
export function mapDocSwatchIds<T extends { doc?: Record<string, unknown> }>(
  design: T,
  map: SwatchIdMap,
): T {
  const doc = design.doc as
    { palette?: WithSwatch[]; layers?: DocLayer[] } | undefined;
  if (!doc) return design;
  // A malformed document is the client's mistake: answer 400, not a 500 from the code below.
  const isList = (v: unknown) => v === undefined || Array.isArray(v);
  const isMap = (v: unknown) =>
    v === undefined ||
    (typeof v === 'object' && v !== null && !Array.isArray(v));
  if (
    !isList(doc.palette) ||
    !isList(doc.layers) ||
    doc.layers?.some(
      (l) =>
        typeof l !== 'object' ||
        l === null ||
        !isMap(l.tiles) ||
        !isList(l.shapes) ||
        Object.values(l.tiles ?? {}).some((pieces) => !Array.isArray(pieces)),
    )
  )
    throw new BadRequestException('The rug document is malformed.');
  const layers = doc.layers?.map((l) => {
    if (l.kind === 'tiles' && l.tiles)
      return {
        ...l,
        tiles: Object.fromEntries(
          Object.entries(l.tiles).map(([k, pieces]) => [
            k,
            pieces.map((p) => withId(p, map)),
          ]),
        ),
      };
    if (l.kind === 'shapes')
      return {
        ...l,
        ...(l.ground && { ground: withId(l.ground, map) }),
        ...(l.shapes && { shapes: l.shapes.map((s) => withId(s, map)) }),
      };
    return l;
  });
  return {
    ...design,
    doc: {
      ...doc,
      ...(doc.palette && { palette: doc.palette.map((y) => withId(y, map)) }),
      ...(layers && { layers }),
    },
  };
}
