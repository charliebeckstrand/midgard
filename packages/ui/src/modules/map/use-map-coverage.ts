'use client'

import { useMemo } from 'react'
import { cachedGeographyFeatures } from './engine/map-geometry/cache'
import { cachedRegionIndex } from './engine/map-geometry/locate'
import { defaultRegionGroup } from './engine/map-region/identity'
import { defaultZipId, zipArea } from './engine/map-zip/dissolve'
import { coverageGroups, groupFrame } from './engine/map-zip/frame'
import {
	type MapZipSelection,
	parseZipSelection,
	zipMatcher,
	zipSelectionText,
} from './engine/map-zip/selection'
import type {
	MapFeature,
	MapFeatureCollection,
	MapGeography,
	MapPolygons,
	MapShape,
} from './engine/types'

/**
 * What {@link useMapCoverage} reads: the territory, the ZIP geometry it is drawn
 * from, and the region geometry it is framed against.
 */
export type MapCoverageOptions = {
	/**
	 * The territory, as the terms a broker states it in: whole codes (`60601`),
	 * ZIP3 prefixes (`606`), inclusive ranges (`60601-60640`), and a `!` in front
	 * of any of those to take it back out again. Separate terms with commas,
	 * semicolons, or space, and pass one string or a list of them.
	 *
	 * A ZIP+4 reads as its five-digit code, so a `ZipcodeInput`'s own output
	 * parses as-is. A term that reads as nothing is reported in `invalid` and
	 * otherwise ignored, so one typo never voids a pasted territory.
	 */
	coverage: MapZipSelection
	/**
	 * The ZIP geometry the territory is cut from — a ZCTA atlas, as a TopoJSON
	 * topology or a GeoJSON feature collection. The package ships no atlas data.
	 *
	 * Pass a topology wherever the outline matters. TopoJSON holds each shared
	 * border once, so the covered codes dissolve exactly: the seams between
	 * neighbours disappear, an uncovered code inside the territory comes out as a
	 * hole, and separate clusters come out as separate parts. A feature collection
	 * repeats every shared border, and cannot be dissolved without a
	 * polygon-clipping pass this module does not carry, so it draws each code's own
	 * outline and `dissolved` reports `false`.
	 */
	zips?: MapGeography | null
	/** Which topology object holds the codes; defaults to the topology's first key. */
	zipsObject?: string
	/**
	 * How a ZIP shape names its code.
	 * @defaultValue the shape's `id`, else the first Census ZCTA property it
	 * carries (`ZCTA5CE20`, `ZCTA5CE10`, `GEOID20`, and the rest)
	 */
	zipId?: (shape: MapShape) => string
	/**
	 * The region geometry the map is split by — a county atlas. The hook returns
	 * the subset the territory lands in, ready to hand to `MapPlat` as its
	 * `geography`.
	 */
	regions?: MapGeography | null
	/** Which topology object holds the regions; defaults to the topology's first key. */
	regionsObject?: string
	/**
	 * Which group a region belongs to — the state a county sits in. The frame
	 * keeps every region whose group the territory reaches, so a territory in one
	 * state draws that whole state split into its counties.
	 * @defaultValue the first two characters of the region's id, which is the
	 * state FIPS code in every US county atlas
	 */
	regionGroup?: (feature: MapFeature) => string
}

/** What {@link useMapCoverage} resolves: the geography to draw, and the territory to draw on it. */
export type MapCoverage = {
	/**
	 * The regions of every group the territory reaches, as a feature collection
	 * to hand `MapPlat` as its `geography` — the states it covers, split into
	 * their counties. `null` while the territory places nowhere, which is what an
	 * empty selection, a missing atlas, and a territory outside the regions all
	 * read as.
	 */
	geography: MapFeatureCollection | null
	/** The territory's rings, to hand `MapGeofence` as its `area`. */
	area: MapPolygons
	/** The codes the territory matched, in the atlas's own order. */
	codes: string[]
	/** The groups the territory reached — the state ids `geography` was cut to. */
	groups: string[]
	/** The stated terms that read as no rule, for a field to mark. */
	invalid: string[]
	/** Whether the rings dissolved exactly; `false` for a feature-collection source. */
	dissolved: boolean
}

/**
 * Nothing placed. Shared so the groups below keep one identity across every
 * render that places nothing, which is what holds the frame's own memo.
 *
 * @internal
 */
const NO_PLACEMENT: { features: MapFeature[]; groups: string[] } = { features: [], groups: [] }

/**
 * Resolves a ZIP-code territory into the two things a map draws it with: the
 * geography to frame, and the outline to fence.
 *
 * A broker states coverage in codes — whole ones, ZIP3 prefixes, ranges — and a
 * code names no state on its own. So the hook cuts the covered codes out of a
 * ZCTA atlas, dissolves them into one territory, finds which states that
 * territory's codes land in, and hands back that state's counties as the
 * geography to draw. `MapPlat` fits whatever geography it is given, so the state
 * frames itself and no new projection rule is involved.
 *
 * @param options - The territory, the ZIP geometry, and the region geometry.
 * @returns The geography to draw, the outline to fence, and what was matched.
 *
 * @remarks Keep `zips`, `regions`, `zipId`, and `regionGroup` steady across
 * renders — a fetched atlas, a module-scope function. Each stage memoises on
 * them, and the decode behind the region atlas is the same order of work as
 * drawing it.
 *
 * The passes are split so the expensive ones answer the atlas rather than the
 * territory: decoding an atlas and indexing it are memoised across instances and
 * mounts, so typing into a coverage field re-cuts and re-dissolves alone.
 *
 * A code belongs to the state its own centroid lands in. Codes do cross state
 * lines, and the centroid settles which side such a code counts for.
 *
 * @example A broker's Chicagoland territory, framed on Illinois.
 * ```tsx
 * const { geography, area, codes } = useMapCoverage({
 *   coverage: '606, 60640-60649, !60666',
 *   zips: zctaTopology,
 *   regions: countyTopology,
 * })
 *
 * <MapPlat label="Coverage" geography={geography} projection="albers-usa">
 *   <MapGeofence area={area} label="Covered" detail={`${codes.length} ZIPs`} />
 * </MapPlat>
 * ```
 */
export function useMapCoverage({
	coverage,
	zips,
	zipsObject,
	zipId = defaultZipId,
	regions,
	regionsObject,
	regionGroup = defaultRegionGroup,
}: MapCoverageOptions): MapCoverage {
	// The territory keyed by its own text rather than by the prop's identity: a
	// caller's `['606', '610']` is a fresh array every render, and every stage
	// below hangs off this. One join is cheaper than re-cutting an atlas.
	const stated = zipSelectionText(coverage)

	const rules = useMemo(() => parseZipSelection(stated), [stated])

	// The cut and the dissolve, over the ZIP atlas alone. This is what a keystroke
	// in a coverage field re-runs, and it touches only the codes the territory
	// names — not the tens of thousands in the file.
	const area = useMemo(
		() => zipArea(zips, zipsObject, zipMatcher(rules), zipId),
		[zips, zipsObject, rules, zipId],
	)

	// The placement, which decodes the region atlas only once a territory has
	// something to place. A map mounted beside an empty coverage field would
	// otherwise decode and rewind a whole county atlas — tens of milliseconds
	// inside the consumer's render — for a result the frame below discards.
	const placed = useMemo(() => {
		if (area.features.length === 0) return NO_PLACEMENT

		const features = cachedGeographyFeatures(regions, regionsObject)

		if (features.length === 0) return NO_PLACEMENT

		const groups = coverageGroups(features, cachedRegionIndex(features), area.features, regionGroup)

		// Sorted so the key below reads the set and not the order the codes reached
		// it: two territories over one state must key alike whichever code placed first.
		return { features, groups: [...groups].sort() }
	}, [regions, regionsObject, area, regionGroup])

	// The groups by content, which is what the frame actually answers. Every stage
	// above re-runs on each keystroke and hands this one fresh objects, but the
	// states a territory lands in rarely change while it is typed.
	const groupKey = placed.groups.join(',')

	// Held on that key, so a frame keeps its identity across a keystroke that did
	// not change the states. `MapPlat` keys its decode, its canonical fit, its
	// region paths, and its chrome on this object — all in weak maps — so a fresh
	// one on every keystroke would re-project the whole county atlas twice per
	// character and never once hit the caches built to prevent exactly that.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `placed.groups` is keyed by `groupKey`, its content
	const geography = useMemo(
		() => groupFrame(placed.features, new Set(placed.groups), regionGroup),
		[placed.features, groupKey, regionGroup],
	)

	return {
		geography,
		groups: placed.groups,
		area: area.polygons,
		codes: area.codes,
		dissolved: area.dissolved,
		invalid: rules.invalid,
	}
}
