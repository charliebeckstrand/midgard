import type { CSSProperties } from 'react'
import { Placeholder } from '../../components/placeholder'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { type MapOutline, mapOutline } from './engine/map-outline'
import { mapFrameSizing, projectionFallbackAspect } from './engine/map-projection/aspect'
import type { MapAspectRatio, MapProjection } from './engine/types'

/** Props for {@link MapSkeleton}. */
export type MapSkeletonProps = {
	/**
	 * The reserved frame's `width / height` — a number or `"4/3"` string,
	 * matching the {@link MapPlat} the skeleton stands in for; `false` fills
	 * the container instead of reserving.
	 * @defaultValue What `projection` reserves, else the plat's own `'auto'`
	 * fallback ratio (16 / 9).
	 */
	aspectRatio?: Exclude<MapAspectRatio, 'auto'>
	/**
	 * The projection the {@link MapPlat} behind this will draw, so the skeleton
	 * reserves what that plat reserves. A projection whose subject is fixed knows
	 * its ratio before its atlas loads. `'albers-usa'` is the United States, and
	 * an atlas-less plat on the default `aspectRatio: 'auto'` reserves exactly
	 * that. Without it the skeleton reserved 16/9 in front of a plat reserving
	 * 1.709. That is an ~18px jump at 800px wide, in the swap this component
	 * exists to prevent.
	 *
	 * An explicit {@link aspectRatio} still wins: it is the narrower statement, and a
	 * plat given an `aspectRatio` of its own is the case it answers.
	 *
	 * The world projections and a passed instance frame arbitrary geography, so
	 * they reserve nothing and fall through to the generic default.
	 */
	projection?: MapProjection
	/**
	 * Draws the outline of the projection's geography in place of the rectangle,
	 * so the skeleton reads as the map that comes. `'albers-usa'` draws the United
	 * States. `'mercator'` and `'equal-earth'` draw the land of the world without
	 * Antarctica. The outline is built into the package, so it shows on the first
	 * paint, before any atlas loads.
	 *
	 * The outline scales to meet the box and centers in it, as the plat fits its
	 * geography. A plat that draws the same geography under the same projection
	 * therefore draws it where the outline was. A plat that draws other
	 * geography, such as one country under `'mercator'`, does not match. Leave
	 * the outline off for it.
	 *
	 * A projection with no outline, such as a passed d3 instance, draws the
	 * rectangle.
	 * @defaultValue `false`, or `true` for `'albers-usa'`, whose subject is fixed.
	 */
	outline?: boolean
	className?: string
}

/**
 * Map-shaped loading placeholder reserving the frame a {@link MapPlat} will
 * take. The placeholder holds the resolved ratio, so swapping the loaded
 * map in causes no layout shift. Compose it in loading trees that stand in for a
 * plat, such as a Suspense fallback while geography data fetches. Pass the
 * plat's own `aspectRatio` when it fixes one, and its `projection` otherwise,
 * so the two reserve the same box. Where the projection has an outline and
 * `outline` is on, the skeleton draws that outline in place of the rectangle.
 */
export function MapSkeleton({ aspectRatio, projection, outline, className }: MapSkeletonProps) {
	// The plat's own policy, not a copy of it: `mapFrameSizing` is the function
	// `use-map-shape` resolves the frame through, so the order — an explicit
	// aspect, then what the projection knows before its atlas lands, then the
	// generic fallback — and the rule that an unparseable ratio fills instead of
	// reserving are both stated once. Sharing only `projectionFallbackAspect`
	// would share the number and duplicate the policy over it.
	// No height of its own: a fixed-height plat is mirrored with `aspectRatio={false}`
	// and a height class, which is the same statement made once rather than a
	// second prop saying it again.
	const sizing = mapFrameSizing(
		undefined,
		aspectRatio ?? 'auto',
		projectionFallbackAspect(projection),
	)

	// Resolved here, not as a parameter default: the React Compiler skips a
	// default that reads another parameter.
	const shape = (outline ?? projection === 'albers-usa') ? mapOutline(projection) : null

	// An aspect frame is the placeholder itself: full width, and an inline
	// `aspect-ratio` for the height. One element holds the box, so the skeleton
	// has one `data-slot`.
	const aspect = sizing.mode === 'aspect'

	const style = aspect ? { aspectRatio: sizing.ratio } : undefined

	return shape === null ? (
		<Placeholder
			className={cn(...(aspect ? k.skeleton.aspect : k.skeleton.base), className)}
			style={style}
		/>
	) : (
		<MapSkeletonOutline outline={shape} aspect={aspect} style={style} className={className} />
	)
}

/**
 * The outline, drawn as one pulsing shape. `xMidYMid meet` scales it to meet
 * the box and centers the remainder, which is the rule the plat's measured fit
 * follows.
 */
function MapSkeletonOutline({
	outline,
	aspect,
	style,
	className,
}: {
	outline: MapOutline
	aspect: boolean
	style: CSSProperties | undefined
	className?: string
}) {
	return (
		<svg
			data-slot="placeholder"
			aria-hidden="true"
			viewBox={`0 0 ${outline.width} ${outline.height}`}
			preserveAspectRatio="xMidYMid meet"
			className={cn(...(aspect ? k.skeleton.outline.aspect : k.skeleton.outline.base), className)}
			style={style}
		>
			<path d={outline.d} />
		</svg>
	)
}
