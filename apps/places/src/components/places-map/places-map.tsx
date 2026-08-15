'use client'

import { useMemo } from 'react'
import { cn } from 'ui/core'
import {
	type MapCategory,
	type MapFeatureCollection,
	type MapOverlaySelection,
	MapPlat,
	MapPoints,
	type MapProjection,
	MapSkeleton,
} from 'ui/modules/map'
import type { Place } from '../../types'
import type { PlaceVisitFilter } from '../../utilities/places-filter'
import { centredProjection, regionFrame, regionName } from '../../utilities/places-geography'
import { type PlaceView, viewAtlas, viewFrame, viewRegion } from '../../utilities/places-view'
import { placeStops } from './places-map-utilities'

/**
 * What a painted region is called, per filter. The paint means whichever the
 * reader asked for, so the readout has to say that one: under "Not visited" a
 * painted region is one they have not been to, and a fill that reported itself
 * as "Visited" would tell them the opposite of what they filtered for.
 */
const PAINT_LABEL: Record<PlaceVisitFilter, string> = {
	visited: 'Visited',
	unvisited: 'Not visited',
}

/**
 * The region categories: one per name the paint can carry. Both are declared
 * because the category list is fixed at the mark and the rows pick from it — the
 * filter decides which name the rows carry, not which names exist.
 *
 * Green for been, red for not, which is the one pairing a reader brings to the
 * question already. They are held far back in opacity by the wrapper below: at
 * full strength either hue reads as a value on the region, and the dots standing
 * on it carry the values here.
 */
const COVERED_CATEGORIES: MapCategory[] = [
	{ value: PAINT_LABEL.visited, color: 'green' },
	{ value: PAINT_LABEL.unvisited, color: 'red' },
]

/** The one dot mark's id, which every pick and halo is keyed by. */
const MARK_ID = 'places'

/**
 * The readout a summary dot carries. Module-scope because `MapPoints` keys its
 * readout rows on this identity, and a summary's spread costs a spherical pass
 * per merged group — an inline arrow would pay it again on every render.
 */
function clusterDetail(count: number): string {
	return `${count} places`
}

/** The empty row list a cleared paint filter stands for, held so its identity is stable. */
const NO_ROWS: { region: string; visited: string }[] = []

/** Props for {@link PlacesMap}. */
export type PlacesMapProps = {
	/** The atlas the view draws, decoded; `null` while it loads, which reserves the frame. */
	regions: MapFeatureCollection | null
	/** The places to draw — already filtered, so the map draws what the bar admits. */
	places: readonly Place[]
	/** Where the map is pointed, which decides the frame and the projection. */
	view: PlaceView
	/** The regions marked visited in the drawn atlas, by the name that atlas gives them. */
	visited: ReadonlySet<string>
	/** Which regions carry the visited paint, or `undefined` for none of them. */
	visitedRegions: PlaceVisitFilter | undefined
	/** Fires when a region is picked, with the name its atlas gave it. */
	onDrill: (region: string) => void
	/** The place whose panel is open; the map haloes the dot it drew into. */
	selected: Place | null
	/** Fires when a dot is picked, with every place the one dot stands for. */
	onSelect: (places: Place[]) => void
}

/**
 * The map: every place as a dot over the regions that hold them.
 *
 * One mark for the whole set, so dots that land on the same pixels merge however
 * they are categorised — clustering is per-mark, and a mark per category left
 * one category's dot sitting on another's summary badge. Each dot still carries
 * its own category colour; a summary keeps the mark's, because it stands for
 * several categories at once. The filter's swatches are the key to both.
 *
 * A click on any region drills into it, and a drilled region stops answering
 * entirely: only its dots do.
 */
export function PlacesMap({
	regions,
	places,
	view,
	visited,
	visitedRegions,
	onDrill,
	selected,
	onSelect,
}: PlacesMapProps) {
	// The one region the view is cut to, or `null` for the whole atlas.
	const cut = viewRegion(view)

	// What the frame draws, which is what the readout names. Not the same as the
	// cut: inside the United States the frame draws every state and is cut to none
	// of them, and a map that called that "the world" would say the one thing the
	// reader can see it is not.
	const framed = viewFrame(view)

	// The geography to draw: the whole atlas, or the one region a drill opened.
	// Memoised on the cut, because the map keys its decode, its fit, and its paths
	// on the geography's identity — a fresh collection each render would refit the
	// map on every pointer move.
	const geography = useMemo(() => regionFrame(regions, cut), [regions, cut])

	// What the whole atlas draws under: Equal Earth for the world, the composite
	// for the United States.
	//
	// Albers USA is a conic composed of one country, so it draws that country and
	// nothing else: a point outside it projects to nothing at all, which is why it
	// is the right frame for the states and the wrong one for the world. Equal
	// Earth places every point there is, and holds area true while it does.
	//
	// Stated once, because the skeleton reserves this frame and the plat then takes
	// it. Written out at both, the two could disagree and the skeleton would
	// reserve a frame the plat does not draw — which is the jump it exists to
	// prevent.
	const atlasProjection: MapProjection = viewAtlas(view) === 'states' ? 'albers-usa' : 'equal-earth'

	// The whole atlas draws under its own projection; one region cut out of it
	// draws under a mercator centred on itself.
	//
	// Centred rather than plain, because a plain mercator sits on the prime
	// meridian: Alaska's Aleutians cross the antimeridian, so its bounds read as
	// most of the globe and the region fitted to a fraction of the frame.
	//
	// Held rather than rebuilt, because the plat fits a passed instance directly
	// and keys that fit on the projection's identity.
	const projection = useMemo<MapProjection>(
		() => (cut === null ? atlasProjection : (centredProjection(geography) ?? 'mercator')),
		[geography, cut, atlasProjection],
	)

	// One row per painted region. The category is the same for all of them: this is
	// a bit and not a measure, so one category paints alike and draws no legend of
	// its own.
	//
	// Which regions those are is the bar's to say, not the places'. A region is
	// visited because the reader marked it, so a state they drove through paints
	// and a country holding a place they have only planned does not — and with the
	// filter cleared none of them paint, which is the map with the question turned
	// off rather than answered. The dots are drawn either way.
	//
	// A drill keeps the same rule rather than lighting whatever it opened, so the
	// fill a region carries on the whole atlas is the fill it carries a level in.
	//
	// What a drilled region loses is the pointer, not the paint — see
	// `regionPointer` below for why the two are separated here.
	const rows = useMemo(() => {
		if (visitedRegions === undefined) return NO_ROWS

		const named = (regions?.features ?? []).map(regionName)

		const painted = named.filter((name) =>
			visitedRegions === 'visited' ? visited.has(name) : !visited.has(name),
		)

		const rows = painted.map((name) => ({ region: name, visited: PAINT_LABEL[visitedRegions] }))

		return cut === null ? rows : rows.filter((row) => row.region === cut)
	}, [regions, visited, visitedRegions, cut])

	// Every place in one mark, so two dots that land on the same pixels merge into
	// one summary whatever categories they belong to. Clustering is per-mark: a
	// mark drawn per category left a dot of one category sitting on top of another
	// category's summary badge, which reads as a bug and is unpickable besides.
	//
	// A dot keeps its category's colour through it: the mark's slot is what a
	// summary wears, since a merged dot stands for several categories and any one
	// of theirs would name it wrongly.
	//
	// Built here rather than in the JSX because `MapPoints` keys its whole
	// pipeline on the identity of `points`: the clustering, the crowding, the
	// readout rows, and the memoised dot layer that exists to stop hundreds of
	// dots rebuilding. A fresh array per render would redo all of it on every
	// click, drawer, and filter change, to produce what it already had.
	const stops = useMemo(() => placeStops(places), [places])

	// The picked dot, as the pair the map haloes by. One mark, so the id is fixed
	// and only the index moves; a summary haloes wherever the pick merged into.
	const selectedOverlay = useMemo<MapOverlaySelection | null>(() => {
		if (selected === null) return null

		const index = places.findIndex((place) => place.id === selected.id)

		return index === -1 ? null : { id: MARK_ID, index }
	}, [selected, places])

	if (geography === null) {
		return <MapSkeleton projection={atlasProjection} ratio={false} className="size-full" />
	}

	return (
		// The fit takes every edge of the box it is handed, so without an inset the
		// geography meets the chrome and a coastal dot sits half off the screen. The
		// plat fits whatever box it gets, so the margin is the box.
		<div
			className={cn(
				'size-full p-6 sm:p-10',
				// Nothing on this map recedes. The plat's emphasis reads a region and the
				// dots on it as separate marks, so pointing one dimmed the other — and
				// crossing between them cross-faded the two, which is the flicker a
				// reader sees moving from a region onto a place standing on it. A region
				// and its places are one thing here, so both stay forward and the
				// pointer changes nothing but the readout.
				'[&_[data-slot=map-points]]:opacity-100! [&_[data-slot=map-regions-recede]]:opacity-100!',
				// The paint held far back, so a region reads as tinted ground rather than
				// as a filled shape: the dots carry the values on this map, and a region
				// at full strength takes the eye off them. `fill-opacity` and not
				// `opacity`, which would take the seams between regions with it.
				//
				// Selected by the fill class, because the module gives a region path no
				// category anchor on purpose — a county atlas would pay attribute-rule
				// matching on every one of thousands of paths for it. The two hues here
				// are the ones `COVERED_CATEGORIES` names, written out because Tailwind
				// generates only what it finds literally.
				'[&_[data-slot=map-regions]_.fill-green-600]:[fill-opacity:0.35]',
				'[&_[data-slot=map-regions]_.fill-red-600]:[fill-opacity:0.35]',
			)}
		>
			<MapPlat
				aria-label={framed === null ? 'Places across the world' : `Places in ${framed}`}
				geography={geography}
				projection={projection}
				aspectRatio={false}
				className="size-full"
				// Identity only. The label default already reads `properties.name`,
				// which is what `regionName` returns; identity does not — it is id-first,
				// so a state would answer as "41" where every row here says "Oregon".
				regionId={regionName}
				data={rows}
				regionKey="region"
				categoryKey="visited"
				// The neutral slot, not a categorical one. A covered region is a
				// backdrop that says "there is something here to open", and any of the
				// eight data hues would read as a sixth category — worse, the first of
				// them is the Food dots' own blue, which a blue region swallowed.
				categories={COVERED_CATEGORIES}
				// One mark and one region category, so a legend would draw two rows
				// that each name a paint rather than telling two things apart.
				legend={false}
				// `modifier: false` is the rare form, and this is the case it is for:
				// the map is the screen. The page behind it does not scroll — the
				// layout gives the map the leftover height and nothing overflows — so
				// there is no scroll for a plain wheel to swallow, and arming the wheel
				// outright costs the reader nothing. Under the default, every zoom on a
				// full-screen map would need a held shift key for a page that cannot
				// move.
				//
				// It earns more than it looks. The dots merge by pixel distance, so the
				// summaries a world frame draws separate into their own places as the
				// view closes on them — which is the same question the summary drawer
				// answers, asked on the map instead.
				zoom={{ modifier: false }}
				// The map is navigated, not read: a region with no places still opens
				// into somewhere, so the pointer names every one of them rather than
				// only the regions a row painted.
				nameRegions
				// Inside a drill the layer answers nothing: there is one region on
				// screen and the reader just picked it, so it has nothing left to say,
				// and a readout under every dot they reach for is in the way. The drill
				// is stated here alone — the prop withdraws the readout, the pick, and
				// the pointer cursor together.
				regionPointer={cut === null}
				selectedOverlay={selectedOverlay}
				// Every region opens, whether or not it holds places: an empty one is a
				// place to look, and a reader who has just added somewhere new should not
				// have to find out from a dead click that the map disagreed. The paint
				// still says which regions hold places — it reports, and no longer gates.
				onRegionClick={onDrill}
			>
				<MapPoints
					id={MARK_ID}
					label="Places"
					color="blue"
					detail={String(places.length)}
					points={stops}
					clusterDetail={clusterDetail}
					// A summary is one dot to the reader, so a click on it opens every
					// place under it rather than the first one the pick happened to name.
					onClick={(_id, _index, merged) => {
						onSelect(merged.flatMap((at) => places[at] ?? []))
					}}
				/>
			</MapPlat>
		</div>
	)
}
