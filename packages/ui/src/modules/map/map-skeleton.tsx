import { AspectRatio } from '../../components/aspect-ratio'
import { Placeholder } from '../../components/placeholder'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { mapFrameSizing, projectionFallbackAspect } from './engine/map-projection/aspect'
import type { MapAspectRatio, MapProjection } from './engine/types'

/** Props for {@link MapSkeleton}. */
export type MapSkeletonProps = {
	/**
	 * The reserved frame's `width / height` — a number or `"4/3"` string,
	 * matching the {@link MapPlat} the skeleton stands in for; `false` fills
	 * the container instead of reserving.
	 * @defaultValue what `projection` reserves, else the plat's own `'auto'`
	 * fallback ratio (16 / 9)
	 */
	ratio?: Exclude<MapAspectRatio, 'auto'>
	/**
	 * The projection the {@link MapPlat} behind this will draw, so the skeleton
	 * reserves what that plat reserves. A projection whose subject is fixed knows
	 * its ratio before its atlas loads — `'albers-usa'` is the United States — and
	 * an atlas-less plat on the default `aspectRatio: 'auto'` reserves exactly
	 * that. Without it the skeleton reserved 16/9 in front of a plat reserving
	 * 1.709, which is an ~18px jump at 800px wide, in the swap this component
	 * exists to prevent.
	 *
	 * An explicit {@link ratio} still wins: it is the narrower statement, and a
	 * plat given an `aspectRatio` of its own is the case it answers.
	 *
	 * The world projections and a passed instance frame arbitrary geography, so
	 * they reserve nothing and fall through to the generic default.
	 */
	projection?: MapProjection
	className?: string
}

/**
 * Map-shaped loading placeholder reserving the frame a {@link MapPlat} will
 * take: an `AspectRatio` box holding `ratio`, so swapping the loaded map in
 * causes no layout shift. Compose it in loading trees that stand in for a
 * plat — a Suspense fallback while geography data fetches, for instance —
 * passing the plat's own `aspectRatio` when it fixes one, and its `projection`
 * otherwise so the two reserve the same box.
 */
export function MapSkeleton({ ratio, projection, className }: MapSkeletonProps) {
	// The plat's own policy, not a copy of it: `mapFrameSizing` is the function
	// `use-map-shape` resolves the frame through, so the order — an explicit
	// ratio, then what the projection knows before its atlas lands, then the
	// generic fallback — and the rule that an unparseable ratio fills instead of
	// reserving are both stated once. Sharing only `projectionFallbackAspect`
	// would share the number and duplicate the policy over it.
	const sizing = mapFrameSizing(
		undefined,
		ratio ?? 'auto',
		projection === undefined ? null : projectionFallbackAspect(projection),
	)

	if (sizing.mode !== 'aspect') return <Placeholder className={cn(k.skeleton.base, className)} />

	return (
		<AspectRatio ratio={sizing.ratio} className={className}>
			<Placeholder className={cn(k.skeleton.base)} />
		</AspectRatio>
	)
}
