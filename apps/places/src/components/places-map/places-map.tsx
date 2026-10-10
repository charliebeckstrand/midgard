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
} from 'ui/modules/map'
import { RECORD_KIND_META } from '../../constants'
import type { MapRecord, Place, Trip } from '../../types'
import type { PlaceVisitFilter } from '../../utilities/places-filter'
import { centeredProjection, regionFrame, regionName } from '../../utilities/places-geography'
import { isTrip, placesOffTrips } from '../../utilities/places-trips'
import { type PlaceSelection, selectedIds } from '../../utilities/places-url'
import { type PlaceView, viewAtlas, viewFrame, viewRegion } from '../../utilities/places-view'
import { recordStops } from './places-map-utilities'

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

/** The most names that the readout of a summary gives before it counts the rest. */
const SUMMARY_NAMES = 3

/**
 * The readout of a summary: the names of the records it stands for, up to
 * {@link SUMMARY_NAMES}, then how many more. A summary can hold places and
 * trips together, and its names say what it holds where a count of one kind
 * would not. Module-scope because `MapPoints` keys its readout rows on this
 * identity.
 */
function summaryNames(_count: number, _span: number, labels: string[]): string {
	const named = labels.slice(0, SUMMARY_NAMES).join(', ')

	const more = labels.length - SUMMARY_NAMES

	return more > 0 ? `${named} and ${more} more` : named
}

/** The id of the one mark that draws every record. */
const RECORDS_MARK = 'records'

/** The box the map fills, with the margin that keeps the geography off the chrome. */
const FRAME_INSET = 'size-full p-6 sm:p-10'

/** The empty row list a cleared paint filter stands for, held so its identity is stable. */
const NO_ROWS: { region: string; visited: string }[] = []

/** Props for {@link PlacesMap}. */
export type PlacesMapProps = {
	/** The atlas the view draws, decoded. */
	regions: MapFeatureCollection
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
	/**
	 * Fires when the pointer or the keyboard cursor stays on a region, with the
	 * name that its atlas gave it. The map drills into that region if the reader
	 * picks it, so the caller can render that view first.
	 */
	onPreload?: (region: string) => void
	/** The trips to draw, filtered as the places are. */
	trips: readonly Trip[]
	/** The records whose panel is open; the map haloes the point that the first one drew into. */
	selected: PlaceSelection
	/** Fires when a point is picked, with every record it stands for, of both kinds. */
	onSelect: (selection: PlaceSelection) => void
}

/**
 * The map: every trip as a square and every other place as a dot, over the
 * regions that hold them.
 *
 * A trip is the one point for its places. While the map draws a trip, it does
 * not draw the places on that trip, so they are neither a count on the square
 * nor dots beside it. The trip panel lists them. With the trips not shown, the
 * places of every trip draw as dots again.
 *
 * One mark for the whole set, so points that land on the same pixels merge
 * whatever their kind or category. Each lone point keeps its own shape and
 * color; a summary keeps the mark's color, because it stands for several. A
 * summary of places alone is a circle, and a summary that holds a trip is a
 * square, the shape of the mark. A pick opens every record of the point, of
 * both kinds. The filter's swatches are the key to the shapes and the colors.
 *
 * A click on any region drills into it, and a drilled region stops answering
 * entirely: only its dots do.
 */
export function PlacesMap({
	regions,
	places,
	trips,
	view,
	visited,
	visitedRegions,
	onDrill,
	onPreload,
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
	// Memoized on the cut, because the map keys its decode, its fit, and its paths
	// on the geography's identity — a fresh collection each render would refit the
	// map on every pointer move.
	const geography = useMemo(() => regionFrame(regions, cut), [regions, cut])

	// What the whole atlas draws under: Mercator for the world, the composite for
	// the United States.
	//
	// Albers USA is a conic composed of one country, so it draws that country and
	// nothing else: a point outside it projects to nothing at all, which is why it
	// is the right frame for the states and the wrong one for the world.
	//
	// Mercator for the world, over the equal-area projection this drew before it.
	// Equal Earth holds area true by widening the high latitudes, and it charges
	// that where this map spends most of its time: Greenland comes out 2.67 times
	// wider than tall, and Canada and Russia smear into a band across the top of
	// the frame. Area is not what a map of places you have been is for — the dots
	// are the reading, and the land is where they sit — so the trade is worth
	// undoing. Mercator holds shape instead, which is the thing a reader checks a
	// coastline against, and it is the projection every slippy map has taught them
	// to expect. It fits this frame better too: 1.55 to Equal Earth's 2.28, on a
	// screen nearer 1.8, so it letterboxes far less and the dots are larger.
	//
	// It also settles the map into one family. A drilled region already draws under
	// a centered mercator, so the frame no longer changes its kind on the way in.
	const atlasProjection: MapProjection = viewAtlas(view) === 'states' ? 'albers-usa' : 'mercator'

	// The whole atlas draws under its own projection; one region cut out of it
	// draws under a mercator centered on itself.
	//
	// Centered rather than plain, because a plain mercator sits on the prime
	// meridian: Alaska's Aleutians cross the antimeridian, so its bounds read as
	// most of the globe and the region fitted to a fraction of the frame.
	//
	// Held rather than rebuilt, because the plat fits a passed instance directly
	// and keys that fit on the projection's identity.
	const projection = useMemo<MapProjection>(
		() => (cut === null ? atlasProjection : (centeredProjection(geography) ?? 'mercator')),
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

		const named = regions.features.map(regionName)

		const painted = named.filter((name) =>
			visitedRegions === 'visited' ? visited.has(name) : !visited.has(name),
		)

		const rows = painted.map((name) => ({ region: name, visited: PAINT_LABEL[visitedRegions] }))

		return cut === null ? rows : rows.filter((row) => row.region === cut)
	}, [regions, visited, visitedRegions, cut])

	// Every record in one mark, so two points that land on the same pixels merge
	// into one summary whatever their kind or category. Clustering is per mark: a
	// mark drawn per category left a dot of one category sitting on top of another
	// category's summary badge, and a mark per kind left a trip square under the
	// dots of the places near it. Both read as a bug and are unpickable besides.
	// The trips go first, so a summary's readout names them first.
	const records = useMemo<MapRecord[]>(
		() => [...trips, ...placesOffTrips(places, trips)],
		[places, trips],
	)

	// A point keeps its own shape and color through it: the mark's slot is what a
	// summary wears, since a merged point stands for several categories and any
	// one of theirs would name it wrongly.
	//
	// Built here rather than in the JSX because `MapPoints` keys its whole
	// pipeline on the identity of `points`: the clustering, the crowding, the
	// readout rows, and the memoized dot layer that exists to stop hundreds of
	// dots rebuilding. A fresh array per render would redo all of it on every
	// click, drawer, and filter change, to produce what it already had.
	const stops = useMemo(() => recordStops(records), [records])

	// The picked point, as the pair the map haloes by: the mark, and the index of
	// the first record of the selection that the map draws. A place on a drawn
	// trip is in the point of the trip, so the trip stands for it. A summary
	// haloes wherever the pick merged into.
	const selectedOverlay = useMemo<MapOverlaySelection | null>(() => {
		const drawnAt = new Map(records.map((record, index) => [record.id, index]))

		const placeById = new Map(places.map((place) => [place.id, place]))

		for (const id of selectedIds(selected)) {
			const trips = placeById.get(id)?.visits.flatMap((visit) => visit.tripId ?? []) ?? []

			const index = [id, ...trips].map((held) => drawnAt.get(held)).find((at) => at !== undefined)

			if (index !== undefined) return { id: RECORDS_MARK, index }
		}

		return null
	}, [selected, records, places])

	return (
		// The fit takes every edge of the box it is handed, so without an inset
		// the geography meets the chrome and a coastal dot sits half off the
		// screen. The plat fits whatever box it gets, so the margin is the box.
		<div
			className={cn(
				FRAME_INSET,
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
				// The same regions that a click drills into. Inside a drill the layer
				// answers nothing, so nothing preloads there either.
				onRegionPreload={cut === null ? onPreload : undefined}
				// The dots pop in when they arrive. Each view is a map of its own, so
				// a drill plays the entry again for the places it shows.
				animate
			>
				<MapPoints
					id={RECORDS_MARK}
					label={trips.length > 0 ? 'Places and trips' : RECORD_KIND_META.places.label}
					shape={RECORD_KIND_META.trips.shape}
					color={RECORD_KIND_META.places.color}
					detail={String(records.length)}
					points={stops}
					clusterDetail={summaryNames}
					onClick={(_id, _index, merged) => {
						const picked = merged.flatMap((at) => records[at] ?? [])

						onSelect({
							places: picked.filter((record) => !isTrip(record)).map((record) => record.id),
							trips: picked.filter(isTrip).map((record) => record.id),
						})
					}}
				/>
			</MapPlat>
		</div>
	)
}
