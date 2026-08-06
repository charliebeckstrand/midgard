/**
 * The standing pick on an overlay mark, drawn behind the mark it marks: the
 * mark's own path in the selection ink, stroked wider by
 * {@link MARK_SELECTED_HALO} either side so the neutral shows as a band around
 * the edge. Behind rather than over, so the mark's colour, its count, and its
 * geometry all read through untouched — the region ring's `fill="none"`
 * discipline in the one form a stroke-painted mark allows.
 *
 * One shape serves a line and a dot alike, because a dot is a zero-length
 * round-capped stroke here: both take the mark's own width plus the clear space,
 * so the band reads the same behind a route and behind a summary graded four
 * steps up.
 *
 * A halo draws outside its mark's dim wrapper, so a pick made before the pointer
 * arrived still marks its mark while the pointer isolates elsewhere, and it never
 * answers the pointer: the mark's own hit shape stays the sole target, so the
 * hover resolve can't read one mark twice.
 */

import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { MARK_SELECTED_HALO } from './map-constants'
import { dotPath, type MapPoint2D } from './map-geometry'

/** Props for {@link MapHalo}. @internal */
type MapHaloProps = {
	/** The halo's `data-slot` name, naming the mark it stands behind. */
	slot: string
	/** The mark's own path data — the halo traces it, so the two can never diverge. */
	d: string
	/** The mark's own stroke width in device pixels; the halo takes it plus the clear space either side. */
	width: number
}

/**
 * A picked mark's halo — a route, a marker's connector, a dot through
 * {@link MapDotHalo}.
 *
 * @remarks The width rides device pixels like every other mark spec, so a resize
 * whose refit lands a beat late never fattens a halo past the mark it sits
 * behind.
 *
 * @internal
 */
export function MapHalo({ slot, d, width }: MapHaloProps) {
	return (
		<path
			data-slot={slot}
			d={d}
			fill="none"
			strokeWidth={width + MARK_SELECTED_HALO * 2}
			strokeLinecap="round"
			strokeLinejoin="round"
			vectorEffect="non-scaling-stroke"
			pointerEvents="none"
			className={cn(k.selected)}
		/>
	)
}

/** Props for {@link MapDotHalo}. @internal */
type MapDotHaloProps = {
	/** The halo's `data-slot` name, naming the mark it stands behind. */
	slot: string
	/** The dot's projected frame position. */
	at: MapPoint2D
	/** The dot's own radius in device pixels. */
	radius: number
}

/**
 * A picked dot's halo — a point, a marker pin, one of a `MapPoints` set. Drawn
 * from the same zero-length round-capped stroke `MapDot` draws, so the radius
 * holds at device-pixel size where a `<circle>`'s would scale with the viewBox.
 *
 * @internal
 */
export function MapDotHalo({ slot, at, radius }: MapDotHaloProps) {
	return <MapHalo slot={slot} d={dotPath(at)} width={radius * 2} />
}
