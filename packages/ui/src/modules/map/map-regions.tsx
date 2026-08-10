'use client'

import {
	type CSSProperties,
	memo,
	type PointerEvent,
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { useMapHoverSet, useMapPointedMark } from './context'
import { REGION_SELECTED_STROKE_WIDTH, REGION_STROKE_WIDTH } from './engine/map-constants'
import { regionIndexAt } from './engine/map-hover/anchor'
import { REGION_WASH_SETTLE } from './engine/map-motion'
import type { MapCategoryMeta } from './engine/map-region/category'
import {
	type MapRegionLayer,
	type MapWash,
	paintAt,
	resolveRegionPaints,
	washStyle,
} from './engine/map-region/paint'
import { MapRegionsLit } from './map-regions-lit'

/**
 * Props for {@link MapRegions}: what both layers draw from, minus the paint
 * table — this component resolves that itself, from the categories and the
 * toggles below.
 *
 * @internal
 */
export type MapRegionsProps = Omit<MapRegionLayer, 'paints'> & {
	categories: MapCategoryMeta[]
	/**
	 * Whether anything on this map reads out — a region the rows matched, or a
	 * registered overlay. Off, the region paths take no pointer handlers at all.
	 * A backdrop map would otherwise commit hover state on every move across
	 * every one of its paths, re-rendering the provider and a tooltip that
	 * resolves nothing: the pointed-emphasis gate lights no unmatched region, so
	 * the whole cascade ends where it began. It is the same predicate that
	 * withholds the table and the tab stop, reaching the one channel they left.
	 *
	 * A clickable map keeps its affordance either way — the pointer cursor and
	 * the hover brightening are classes on the layer and the path, not this.
	 */
	interactive: boolean
	/** Toggled-off legend ids; a hidden category's regions fall back to neutral. */
	hidden: ReadonlySet<string>
	/** The emphasised legend id; regions outside its category recede. */
	emphasis: string | null
	animate: boolean
	/**
	 * Reports the region under a click, resolved by {@link regionIndexAt}
	 * delegation on the layer group — so the memoised per-region paths take no
	 * handler prop, and this handler's identity (the one input here a consumer
	 * controls) never reaches the layer the county atlas depends on. Set, it also
	 * turns on the pointer cursor and lifts the hover emphasis to every region,
	 * no-data ones included: under a click each is a target, not just the matched
	 * ones.
	 *
	 * The paths themselves stay presentational: the plot is a `role="img"` leaf
	 * over an `aria-hidden` SVG, so a focusable path would be unreachable to
	 * assistive tech and, at a county atlas's scale, thousands of invisible
	 * stops. The keyboard reaches this click through the plot region instead —
	 * one tab stop whose cursor Enter and Space activate (`use-map-keyboard`) —
	 * so the same report answers both inputs and the region values stay in the
	 * data table for parity.
	 */
	onRegionClick?: (index: number) => void
	/**
	 * Reports the region under a right-click, resolved by the same
	 * {@link regionIndexAt} delegation {@link onRegionClick} uses — the hover
	 * provider deliberately isolates its state, so a context menu wrapping the map
	 * from outside cannot read it and the clicked region must be reported outward
	 * instead.
	 *
	 * Unlike {@link onRegionClick} this takes no pointer affordance: a right-click
	 * is not advertised by a cursor, and the wrapping menu — not the region layer
	 * — carries the keyboard model. Never prevents default, so that menu still
	 * opens; this only names WHICH region it opened over.
	 */
	onRegionContextMenu?: (index: number) => void
	/**
	 * The selected region's feature index, `null` when nothing is picked —
	 * {@link MapPlat} resolves it from the public identity. It only rings the
	 * region; the layer's clickability rides {@link onRegionClick} alone, so a
	 * map showing a pick made elsewhere takes no pointer affordance it can't
	 * honour.
	 */
	selected: number | null
}

/**
 * A delegated pointer handler for the region layer: resolves the region under
 * the event through {@link regionIndexAt} and reports its index, or nothing when
 * the event landed off every region. `undefined` for an absent reporter, so the
 * layer group takes no handler it would only no-op in.
 *
 * One resolver for the click and the right-click, so the two can't drift on what
 * counts as a hit — and delegated here rather than per path, keeping the handler
 * off `Region`'s memo comparison across thousands of instances.
 *
 * @internal
 */
function regionDelegate(
	report: ((index: number) => void) | undefined,
): ((event: { target: EventTarget }) => void) | undefined {
	if (report === undefined) return undefined

	return (event) => {
		const index = regionIndexAt(event.target)

		if (index !== null) report(index)
	}
}

/** Props for {@link Region}: one feature's path plus its resolved paint. @internal */
type RegionProps = {
	d: string
	index: number
	className: string
	/** The `fill` attribute colour for a numeric bin, `undefined` for a class fill. */
	fillColor: string | undefined
	/** The wash's transition timing under `animate`; `undefined` on static maps. */
	style: CSSProperties | undefined
	/** `undefined` on a map with nothing to read out, which answers no pointer. */
	onTrack: ((event: PointerEvent<SVGPathElement>) => void) | undefined
}

/**
 * One region path. A categorical slot fills by Tailwind class; a numeric bin
 * fills by a `fill` attribute colour from the consumer's `colorRange`.
 * No-data — and the pre-reveal beat under `animate` — takes the neutral class.
 *
 * Memoised on its resolved primitives: a legend toggle or the reveal flip
 * re-renders the categories whose paint changed and every other region holds
 * its last render. The wash styles are shared objects, so a region outside the
 * change compares equal on its timing too — until the stagger retires, the one
 * flip that re-keys every region's style and so re-renders the whole layer.
 *
 * @internal
 */
const Region = memo(function Region({
	d,
	index,
	className,
	fillColor,
	style,
	onTrack,
}: RegionProps) {
	return (
		<path
			// The region's DOM anchor: the hover provider's scroll-settle resolve,
			// the shared track handler, and the tests name the region straight off
			// this attribute. Deliberately not a `data-slot`: the stylesheet carries
			// `[data-slot=…]` attribute selectors for other components, so on a
			// county atlas thousands of paths would each pay attribute-rule
			// matching at first style resolution — a quarter of the mount — for an
			// anchor nothing styles by. The layer keeps its `map-regions` slot.
			data-region-index={index}
			d={d}
			// A numeric bin's colour rides the `fill` presentation attribute, not
			// an inline style: per-element CSSOM style declarations priced ~a fifth
			// of the choropleth mount. A value paint never carries a fill class, so
			// nothing in the cascade sits above the attribute.
			fill={fillColor}
			strokeWidth={REGION_STROKE_WIDTH}
			// The border rides device pixels, not viewBox units, so it stays a
			// hairline whatever the viewBox-to-box ratio is: a resize that lands
			// the refit a beat late (the box grown past the frame the marks were
			// built against) scales the geometry crisply but must not fatten the
			// stroke with it — the constant-pixel refit sharpens, this pins.
			vectorEffect="non-scaling-stroke"
			className={className}
			style={style}
			onPointerEnter={onTrack}
			onPointerMove={onTrack}
		/>
	)
})

/** Props for {@link MapRegionsBase}: the layer's own inputs, none of the shared emphasis. @internal */
type MapRegionsBaseProps = MapRegionLayer & { wash: MapWash; interactive: boolean }

/**
 * Every region path, painted by category. Deliberately blind to the shared
 * emphasis — the pointed mark and the legend focus recede this layer from
 * outside ({@link MapRegions}) — so on a county atlas the three-thousand-path
 * tree never re-renders while the pointer travels or a legend chip is held;
 * only a toggle, the reveal's flips, or new geometry re-maps it. The paint table
 * arrives resolved from the parent, so the memo compares one stable reference
 * where it once compared the four inputs behind it.
 *
 * @internal
 */
const MapRegionsBase = memo(function MapRegionsBase({
	paths,
	regionCategory,
	paints,
	wash,
	interactive,
}: MapRegionsBaseProps) {
	const set = useMapHoverSet()

	// One stable handler for every region, reading the pointed index off the
	// path's own anchor attribute: a layer re-render allocates no per-region
	// closures, and the memoised Region's props hold their identity.
	const track = useCallback(
		(event: PointerEvent<SVGPathElement>) => {
			set(
				{ kind: 'region', index: Number(event.currentTarget.getAttribute('data-region-index')) },
				{ x: event.clientX, y: event.clientY },
			)
		},
		[set],
	)

	return (
		<>
			{paths.map((d, index) => {
				if (d === null) return null

				const paint = paintAt(paints, regionCategory[index] ?? null)

				return (
					<Region
						// biome-ignore lint/suspicious/noArrayIndexKey: regions are index-aligned with the features and never reorder.
						key={index}
						d={d}
						index={index}
						className={paint.className}
						fillColor={paint.fillColor}
						style={washStyle(index, wash)}
						onTrack={interactive ? track : undefined}
					/>
				)
			})}
		</>
	)
})

/**
 * The region paths — every feature filled by its category's slot colour, the
 * neutral no-data fill where nothing matches (or the category is toggled
 * off — a hole in a map reads broken, unlike a missing bar). Regions are
 * their own hit targets: browser SVG hit testing is the point-in-polygon
 * test, so pointing one moves the shared hover target directly.
 *
 * The shared emphasis recedes the layer as one group — the pointed mark
 * isolates itself, else the legend's focused group holds — and the
 * emphasised marks redraw lit above it ({@link MapRegionsLit}). One element
 * fades where thousands of per-path transitions once ran, and the base tree
 * holds its render through the whole interaction. The selected region rings
 * above both and outside the recede, so the standing pick outlasts every
 * passing emphasis: a selection made before the pointer arrived must not
 * vanish under it. That ring marks the region rather than repainting it —
 * `fill="none"` leaves the region's own colour, and whatever dim it carries,
 * reading through.
 *
 * @remarks Under `animate` the geography paints solid at once and only the
 * category colour washes in: each region's fill crossfades from the neutral
 * backdrop to its slot colour with a capped per-index stagger. It is a CSS
 * colour transition on a plain `<path>` (not a motion fade), so the geometry
 * itself never fades, a many-region atlas never draws out the reveal, and the
 * region layer carries no motion runtime; `motion-reduce` drops the transition.
 * The stagger is the reveal's alone and retires with it ({@link MapWash}), so a
 * later legend toggle crossfades on the same tempo without a reveal delay in
 * front of it.
 *
 * Memoised so it repaints only when its own geometry, category, or legend
 * state changes: an overlay child registering its legend entry re-renders the
 * plat, but the region layer holds. The pointed mark arrives through its own
 * context, past the memo — and lands on the recede wrapper and the lit
 * overlay only, so a crossing re-renders one copy path while the
 * three-thousand-path base stands.
 * @internal
 */
export const MapRegions = memo(function MapRegions({
	paths,
	regionCategory,
	categories,
	interactive,
	hidden,
	emphasis,
	animate,
	onRegionClick,
	onRegionContextMenu,
	selected,
}: MapRegionsProps) {
	const set = useMapHoverSet()

	const pointed = useMapPointedMark()

	// The colour reveal: static maps colour at once; an animated map holds the
	// neutral backdrop for the first beat, then flips to the category fills so
	// the CSS colour transition washes them in over the already-painted
	// geography. Gated on the paths landing, not mere mount — a lazily fetched
	// atlas mounts the region layer empty first, so keying off paths keeps the
	// wash for the beat the regions appear. A one-way flag: it never resets, so
	// a resize never replays the wash.
	const [revealed, setRevealed] = useState(!animate)

	useEffect(() => {
		if (animate && paths.length > 0) setRevealed(true)
	}, [animate, paths.length])

	// Whether the reveal has washed through, so its per-region stagger can retire
	// ({@link MapWash} carries why it must). The delay has to outlive the flip that
	// starts the wash — a transition reads its timing from the style it lands in,
	// so dropping the stagger in the same commit would drop the stagger itself — so
	// the clock runs from the flip. A one-way flag beside the reveal it retires, so
	// a resize never re-arms it, and the effect reads neither flag it writes.
	//
	// Retiring re-keys every region's wash style, so it costs one pass over the
	// layer — committed as a transition, the priority the plot's own refit rides,
	// since nothing waits on it: the reveal it ends has already played, and until
	// the pass lands the regions hold a delay that only a fill change would read.
	// It runs for a reduced-motion reader too, where the stagger it retires was
	// already inert (`motion-reduce` drops the transition the delay belongs to) —
	// unlike the legend's own hold, which withholds a visible dim and so has to
	// read the preference.
	const [settled, setSettled] = useState(!animate)

	useEffect(() => {
		if (!animate || !revealed) return

		const timer = setTimeout(
			() => startTransition(() => setSettled(true)),
			REGION_WASH_SETTLE * 1000,
		)

		return () => clearTimeout(timer)
	}, [animate, revealed])

	const wash: MapWash = animate ? (settled ? 'settled' : 'reveal') : 'none'

	const clickable = onRegionClick !== undefined

	// One paint table for both layers: the memo's identity holds across the
	// pointed-mark re-renders this component takes per crossing, so the base
	// layer's memo still compares equal — and the lit overlay, which mounts and
	// unmounts with the emphasis, reads the cached table instead of resolving
	// its own from cold on every hover-in.
	const paints = useMemo(
		() => resolveRegionPaints(categories, hidden, revealed, animate, clickable),
		[categories, hidden, revealed, animate, clickable],
	)

	const receded = pointed !== null || emphasis !== null

	// A selection naming no drawn region rings nothing: the id may match no
	// feature, and a region the geometry dropped has a `null` path.
	const selectedPath = selected === null ? null : (paths[selected] ?? null)

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: a pointer delegation surface, not an interactive control — the SVG is aria-hidden under the plot's role="img", which is itself the tab stop that carries the click's keyboard counterpart (see use-map-keyboard)
		<g
			data-slot="map-regions"
			// The cursor rides the group and inherits down, so thousands of paths carry
			// no per-region class.
			className={cn(clickable && k.region.clickable)}
			onPointerLeave={() => set(null, null)}
			// Delegated, so the click handler stays off `Region`'s memo comparison —
			// a prop across thousands of instances, and the one input here whose
			// identity a consumer controls.
			onClick={regionDelegate(onRegionClick)}
			// Same delegation, for the region a right-click landed on. Bubbles: a
			// wrapping menu's own capture-phase reset runs first, so an off-region
			// right-click leaves its target cleared and this only fires to overwrite it.
			onContextMenu={regionDelegate(onRegionContextMenu)}
		>
			<g data-slot="map-regions-recede" className={cn(k.group(receded))}>
				<MapRegionsBase
					paths={paths}
					regionCategory={regionCategory}
					paints={paints}
					wash={wash}
					interactive={interactive}
				/>
			</g>

			{receded && (
				<MapRegionsLit
					pointed={pointed}
					emphasis={emphasis}
					paths={paths}
					regionCategory={regionCategory}
					paints={paints}
				/>
			)}

			{selectedPath !== null && (
				<path
					data-slot="map-region-selected"
					d={selectedPath}
					fill="none"
					strokeWidth={REGION_SELECTED_STROKE_WIDTH}
					vectorEffect="non-scaling-stroke"
					// No region anchor and no pointer events: the base path stays the
					// sole hit target, the discipline the lit copies keep.
					className={cn('pointer-events-none', k.region.selected)}
				/>
			)}
		</g>
	)
})
