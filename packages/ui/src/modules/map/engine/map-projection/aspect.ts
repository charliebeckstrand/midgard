/**
 * How much room the map reserves before it draws: the geography's own projected
 * ratio a fixed-subject projection knows before its atlas loads, and the
 * frame-sizing policy it feeds. Dependency-free arithmetic — the loading
 * placeholder reads it without pulling `d3-geo` in behind it.
 */

import type { FrameSizing } from '../../../../hooks'
import { ALBERS_USA_ASPECT, DEFAULT_MAP_ASPECT } from '../map-constants'
import type { MapAspectRatio, MapProjection } from '../types'

/**
 * The aspect a named projection reserves before its geography loads, for a
 * projection whose geographic subject is fixed: `albers-usa` is the United
 * States, so its frame holds the US ratio through a lazy load and never shifts
 * height. The world projections (`mercator`, `equal-earth`) and a passed
 * instance frame arbitrary geography, so they have none — the caller falls back
 * to the generic {@link DEFAULT_MAP_ASPECT}.
 *
 * @internal
 */
export function projectionFallbackAspect(spec: MapProjection): number | null {
	return spec === 'albers-usa' ? ALBERS_USA_ASPECT : null
}

/** Parses a {@link MapAspectRatio} to its numeric `width / height`, or `null` when free-form. @internal */
export function ratioValue(ratio: number | `${number}/${number}` | false): number | null {
	if (ratio === false) return null

	if (typeof ratio === 'number') return ratio > 0 ? ratio : null

	const [w, h] = ratio.split('/').map(Number)

	// Both terms must be present and positive: the type admits a signed
	// `${number}`, so `"-4/3"` would otherwise yield a negative ratio — an invalid
	// CSS `aspect-ratio` — where the numeric branch rejects the same value.
	return w !== undefined && h !== undefined && w > 0 && h > 0 ? w / h : null
}

/**
 * Resolves the map frame's sizing policy, the chart contract with an `'auto'`
 * branch: an explicit `height` always wins as a fixed pixel box; `'auto'`
 * derives from the geography's own projected ratio (from
 * `mapAutoAspect` (`fit.ts`), with a wide fallback when there is nothing to
 * measure), so it never falls through to `fill`; a numeric or `"w/h"` ratio
 * reserves that; `false` leaves the frame free-form to fill its container.
 *
 * @internal
 */
export function mapFrameSizing(
	height: number | undefined,
	aspectRatio: MapAspectRatio,
	autoAspect: number | null,
): FrameSizing {
	if (height !== undefined) return { mode: 'fixed', height }

	const ratio =
		aspectRatio === 'auto' ? (autoAspect ?? DEFAULT_MAP_ASPECT) : ratioValue(aspectRatio)

	return ratio === null ? { mode: 'fill' } : { mode: 'aspect', ratio }
}
