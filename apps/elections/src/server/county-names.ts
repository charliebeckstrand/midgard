import counties from 'us-atlas/counties-albers-10m.json'
import { type CountyNames, foldName } from './civic-race'

/** One county of the atlas topology: its FIPS code and its name. */
type AtlasCounty = { id?: string; properties?: { name?: string } }

/** The county object of the atlas. The JSON import types its literal shape, which this reads structurally. */
const atlas = counties as unknown as { objects: { counties: { geometries: AtlasCounty[] } } }

/** The FIPS codes of the counties of each state, by folded name. Built once. */
const byState = new Map<string, Map<string, string>>()

for (const county of atlas.objects.counties.geometries) {
	const fips = county.id

	const name = county.properties?.name

	if (fips === undefined || name === undefined) continue

	const state = fips.slice(0, 2)

	const names = byState.get(state) ?? new Map<string, string>()

	names.set(foldName(name), fips)

	byState.set(state, names)
}

const NONE: ReadonlyMap<string, string> = new Map()

/**
 * The FIPS codes of the counties of a state in `us-atlas`, by name in
 * lowercase. They come from the projected atlas that the map draws, so each
 * county that the parser joins has a shape. The parser reads a county that civicAPI sends with no code, such
 * as `Lac Qui Parle` in Minnesota, through it.
 */
export const atlasCountyNames: CountyNames = (stateFips) => byState.get(stateFips) ?? NONE
