/**
 * The standing pick on an overlay mark, drawn behind the mark it marks: the
 * mark's own shape in the selection ink, widened by {@link MARK_SELECTED_HALO}
 * so the neutral shows as a band around the edge. Behind rather than over, so
 * the mark's colour, its count, and its geometry all read through untouched —
 * the region ring's `fill="none"` discipline in the one form a stroke-painted
 * mark allows.
 *
 * A halo draws outside its mark's dim wrapper, so a pick made before the pointer
 * arrived still marks its mark while the pointer isolates elsewhere, and it never
 * answers the pointer: the mark's own hit shape stays the sole target, so the
 * hover resolve can't read one mark twice.
 *
 * Widths ride device pixels, like every other mark spec, so a resize whose refit
 * lands a beat late never fattens a halo past the mark it sits behind.
 */

import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { MARK_SELECTED_HALO } from './engine/map-constants'
import type { MapPoint2D } from './engine/types'
import { MapDot } from './map-dot'

/** The selection ink, off the pointer — one treatment for both halo shapes. @internal */
const HALO = cn('pointer-events-none', k.selected)

/** Props for {@link MapHalo}. @internal */
type MapHaloProps = {
	/** The halo's `data-slot` name, naming the mark it stands behind. */
	slot: string
	/** The mark's own path data — the halo traces it, so the two can never diverge. */
	d: string
	/** The mark's own stroke width in device pixels; the halo takes it plus the clear space either side. */
	width: number
}

/** A picked line's halo — a route, a marker's connector. @internal */
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
			className={HALO}
		/>
	)
}

/** Props for {@link MapDotHalo}. @internal */
type MapDotHaloProps = {
	/** The halo's `data-slot` name, naming the mark it stands behind. */
	slot: string
	/** The dot's projected frame position. */
	at: MapPoint2D
	/** The dot's own radius in device pixels; the halo takes it plus the clear space. */
	radius: number
}

/**
 * A picked dot's halo — a point, a marker pin, one of a `MapPoints` set. It is
 * the dot itself, one clear space wider and in the selection ink: drawing it
 * through {@link MapDot} keeps the dot's own spec — a zero-length round-capped
 * stroke, so the radius holds at device-pixel size where a `<circle>`'s would
 * scale with the viewBox — in the one file that owns it.
 *
 * @internal
 */
export function MapDotHalo({ slot, at, radius }: MapDotHaloProps) {
	return <MapDot slot={slot} at={at} radius={radius + MARK_SELECTED_HALO} className={HALO} />
}
