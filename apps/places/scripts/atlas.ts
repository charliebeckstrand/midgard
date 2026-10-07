/**
 * Writes the atlases of the app from `us-atlas` and `world-atlas`.
 *
 * Run `pnpm atlas` after a change to either package. The script formats the
 * files with Biome. The test `places-atlas.test.ts` compares the files with the
 * output of this script. An atlas that does not agree with its package thus
 * fails.
 *
 * The app bundles the atlases, so each byte of them is in the first load of
 * the map. The script removes only the data that the app does not read. The
 * map thus draws the same paths, and each place goes into the same region:
 *
 * - The objects other than the one that the app draws: `nation` in the states
 *   atlas and `land` in the countries atlas.
 * - The `bbox` of the topology and the `id` of each region. The app reads a
 *   region by its name (see `regionName`).
 * - The regions in {@link UNDRAWN}, and the arcs that only those regions use.
 *
 * Each arc is a flat list of numbers, not a list of pairs. The list has fewer
 * brackets, and `places-atlas.ts` makes the pairs again when the module loads.
 * The script keeps the quantized, delta-encoded numbers of the package, so the
 * decoded positions are the same.
 */

import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import states from 'us-atlas/states-10m.json' with { type: 'json' }
import countries from 'world-atlas/countries-110m.json' with { type: 'json' }

/**
 * The regions that no map of the app draws.
 *
 * Antarctica only, because of how it looks. Each world projection stretches
 * the pole into a band across the bottom of the frame. Under Mercator the band
 * is a tenth of the height of the frame, and it shows nothing that a reader of
 * this app looks for.
 *
 * A place there still draws, because a dot is a position and not a membership.
 * It is in no country and opens no drill, as a place at sea does.
 */
const UNDRAWN = new Set(['Antarctica'])

/** The atlases of the app, and the object of each package that the map draws. */
export const ATLAS_SOURCES = {
	states: { topology: states, object: 'states' },
	countries: { topology: countries, object: 'countries' },
} as const

/** The name of an atlas of the app. */
export type AtlasName = keyof typeof ATLAS_SOURCES

/** A nested list of arc indexes, as a TopoJSON geometry holds it. */
type ArcIndexes = number | ArcIndexes[]

/** One geometry of a TopoJSON object, as far as this script reads it. */
type Geometry = { type: string; arcs?: ArcIndexes[]; properties?: { name?: string } }

/** A TopoJSON topology, as far as this script reads it. */
type Topology = {
	type: 'Topology'
	transform: { scale: [number, number]; translate: [number, number] }
	objects: Record<string, { type: 'GeometryCollection'; geometries: Geometry[] }>
	arcs: [number, number][][]
}

/** An atlas as the app stores it. */
export type PackedAtlas = Omit<Topology, 'arcs'> & { arcs: number[][] }

/** The path of the file that holds an atlas of the app. */
export function atlasFile(atlas: AtlasName): string {
	return fileURLToPath(new URL(`../src/utilities/atlas/${atlas}.json`, import.meta.url))
}

/** Calls `visit` on each arc index in `arcs`. A negative index is the arc `~index`, reversed. */
function eachArc(arcs: ArcIndexes, visit: (index: number) => number): ArcIndexes {
	return Array.isArray(arcs) ? arcs.map((nested) => eachArc(nested, visit)) : visit(arcs)
}

/** The atlas that the app stores for one topology of a package. */
export function packAtlas(atlas: AtlasName): PackedAtlas {
	// `resolveJsonModule` types the import as its literal shape, which is not
	// assignable to the structural `Topology`. The two are the same at runtime.
	const topology = ATLAS_SOURCES[atlas].topology as unknown as Topology

	const { object } = ATLAS_SOURCES[atlas]

	const source = topology.objects[object]

	if (source === undefined) throw new Error(`The ${atlas} atlas has no ${object} object`)

	const drawn = source.geometries.filter(
		(geometry) => !UNDRAWN.has(geometry.properties?.name ?? ''),
	)

	// The arcs that the drawn regions use, in the order of the package. A shared
	// arc stays shared, because each region refers to it by its new index.
	const used = new Set<number>()

	for (const geometry of drawn) {
		eachArc(geometry.arcs ?? [], (index) => {
			used.add(index < 0 ? ~index : index)

			return index
		})
	}

	const kept = [...used].sort((a, b) => a - b)

	const renumbered = new Map(kept.map((index, position) => [index, position]))

	const renumber = (index: number) => {
		const position = renumbered.get(index < 0 ? ~index : index) as number

		return index < 0 ? ~position : position
	}

	const geometries = drawn.map(({ type, arcs, properties }) => ({
		type,
		...(arcs === undefined ? {} : { arcs: arcs.map((nested) => eachArc(nested, renumber)) }),
		properties: { name: properties?.name },
	}))

	return {
		type: 'Topology',
		transform: topology.transform,
		objects: { [object]: { type: 'GeometryCollection', geometries } },
		arcs: kept.map((index) => (topology.arcs[index] ?? []).flat()),
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	for (const atlas of Object.keys(ATLAS_SOURCES) as AtlasName[]) {
		writeFileSync(atlasFile(atlas), `${JSON.stringify(packAtlas(atlas))}\n`)

		execFileSync('biome', ['format', '--write', atlasFile(atlas)], { stdio: 'inherit' })
	}
}
