import type { MapFeatureCollection, MapTopology } from 'ui/modules/map'
import countries from './atlas/countries.json'
import states from './atlas/states.json'
import { decodeRegions } from './places-geography'
import type { PlaceAtlas } from './places-view'

/**
 * Decodes one atlas as the map draws it.
 *
 * `pnpm atlas` (`scripts/atlas.ts`) writes the atlas files from `us-atlas` and
 * `world-atlas`. A file keeps only the regions that the map draws, and it holds
 * each arc as a flat list of numbers. This function makes the pairs of each arc
 * again before it decodes the regions.
 *
 * The atlas is a fixed import, so an atlas with no regions is a fault in the
 * file, not a state that the app can show.
 */
function regionsOf(packed: { arcs: number[][] }, atlas: PlaceAtlas): MapFeatureCollection {
	const arcs = packed.arcs.map((flat) => {
		const pairs: [number, number][] = []

		for (let index = 0; index < flat.length; index += 2) {
			pairs.push([flat[index] as number, flat[index + 1] as number])
		}

		return pairs
	})

	// `resolveJsonModule` types the import as its literal shape, which is not
	// assignable to the structural `MapTopology`. The two are the same at runtime.
	const regions = decodeRegions({ ...packed, arcs } as unknown as MapTopology, atlas)

	if (regions === null) throw new Error(`The ${atlas} atlas holds no regions`)

	return regions
}

/**
 * The regions of each atlas, decoded once for the module.
 *
 * The atlases are part of the code of the app, not a fetch. The first render on
 * the server and the first render in the browser thus both have the geometry.
 * The map paints in its true frame on the first paint, and the opening view, the
 * grouping, and the filter bar are settled from the start. A fetch after
 * hydration showed a skeleton of the United States first, also when the address
 * stated one region.
 *
 * The browser keeps the chunk in its cache with the rest of the code. The
 * 110m world is the coarsest cut that `world-atlas` ships, and the 10m states
 * are the cut that contains its own coastline.
 */
export const ATLASES: Record<PlaceAtlas, MapFeatureCollection> = {
	states: regionsOf(states, 'states'),
	countries: regionsOf(countries, 'countries'),
}
