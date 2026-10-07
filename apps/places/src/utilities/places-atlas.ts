import type { MapFeatureCollection, MapTopology } from 'ui/modules/map'
import states from 'us-atlas/states-10m.json'
import countries from 'world-atlas/countries-110m.json'
import { type BoundedRegion, boundRegions, decodeRegions, topologyNames } from './places-geography'
import { drawnRegions, isDrawn, type PlaceAtlas } from './places-view'

/**
 * The topology of each atlas, as the package ships it.
 *
 * The atlases are part of the code of the app, not a fetch. The first render on
 * the server and the first render in the browser thus both have the geometry.
 * The map paints in its true frame on the first paint, and the opening view, the
 * grouping, and the filter bar are settled from the start. A fetch after
 * hydration showed a skeleton of the United States first, also when the address
 * stated one region.
 *
 * The world is part of the first render for each reader with a place outside
 * the United States, because that reader opens on the world. Thus the world
 * stays in the code too, and a lazy chunk of it cannot pay for itself.
 *
 * The browser keeps the chunk in its cache with the rest of the code. The
 * 110m world is the coarsest cut that `world-atlas` ships, and the 10m states
 * are the cut that contains its own coastline.
 */
const TOPOLOGIES: Record<PlaceAtlas, MapTopology> = {
	// `resolveJsonModule` types each import as its literal shape, which is not
	// assignable to the structural `MapTopology`. The two are the same at runtime.
	states: states as MapTopology,
	countries: countries as MapTopology,
}

/** The decoded regions of each atlas that a caller asked for. */
const decoded = new Map<PlaceAtlas, MapFeatureCollection>()

/** The bounded regions of each atlas that a caller asked for. */
const bounded = new Map<PlaceAtlas, BoundedRegion[]>()

/** The region names of each atlas that a caller asked for. */
const named = new Map<PlaceAtlas, string[]>()

/**
 * The regions of `atlas` as the map draws it, decoded on the first call and
 * kept for the module.
 *
 * The decode waits for its first use, so the hydration does not pay for an
 * atlas that the first render does not draw. A reader inside the United States
 * never decodes the world until they go out to it.
 *
 * The atlas is a fixed import, so an atlas with no regions is a fault in the
 * package, not a state that the app can show.
 */
export function atlasRegions(atlas: PlaceAtlas): MapFeatureCollection {
	const held = decoded.get(atlas)

	if (held !== undefined) return held

	const regions = drawnRegions(decodeRegions(TOPOLOGIES[atlas], atlas))

	if (regions === null) throw new Error(`The ${atlas} atlas holds no regions`)

	decoded.set(atlas, regions)

	return regions
}

/**
 * Each region of `atlas` beside its bounding box, measured on the first call
 * and kept for the module.
 *
 * An atlas never changes, so adding a place does not measure 56 states again,
 * and a crossing to the world does not measure 177 countries again. The
 * measure waits for its first use, for the reason the decode waits.
 */
export function atlasBounded(atlas: PlaceAtlas): BoundedRegion[] {
	const held = bounded.get(atlas)

	if (held !== undefined) return held

	const regions = boundRegions(atlasRegions(atlas))

	bounded.set(atlas, regions)

	return regions
}

/**
 * The names of the regions that `atlas` draws, in the order of the atlas, kept
 * for the module.
 *
 * Read off the topology and not off the decoded regions. The palette lists each
 * country on the first render, and a decode of the world only for its names
 * costs more than the list.
 */
export function atlasNames(atlas: PlaceAtlas): string[] {
	const held = named.get(atlas)

	if (held !== undefined) return held

	const names = topologyNames(TOPOLOGIES[atlas], atlas).filter(isDrawn)

	named.set(atlas, names)

	return names
}
