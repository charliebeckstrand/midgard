import { AspectRatio } from '../../components/aspect-ratio'
import { Placeholder } from '../../components/placeholder'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { DEFAULT_MAP_ASPECT } from './map-constants'
import { ratioValue } from './map-projection'
import type { MapAspectRatio } from './types'

/** Props for {@link MapSkeleton}. */
export type MapSkeletonProps = {
	/**
	 * The reserved frame's `width / height` — a number or `"4/3"` string,
	 * matching the {@link MapPlat} the skeleton stands in for; `false` fills
	 * the container instead of reserving.
	 * @defaultValue the plat's own `'auto'` fallback ratio (16 / 9)
	 */
	ratio?: Exclude<MapAspectRatio, 'auto'>
	className?: string
}

/**
 * Map-shaped loading placeholder reserving the frame a {@link MapPlat} will
 * take: an `AspectRatio` box holding `ratio`, so swapping the loaded map in
 * causes no layout shift. Compose it in loading trees that stand in for a
 * plat — a Suspense fallback while geography data fetches, for instance —
 * passing the plat's own `aspectRatio` when it fixes one.
 */
export function MapSkeleton({ ratio = DEFAULT_MAP_ASPECT, className }: MapSkeletonProps) {
	const value = ratioValue(ratio)

	if (value === null) return <Placeholder className={cn(k.skeleton.base, className)} />

	return (
		<AspectRatio ratio={value} className={className}>
			<Placeholder className={cn(k.skeleton.base)} />
		</AspectRatio>
	)
}
