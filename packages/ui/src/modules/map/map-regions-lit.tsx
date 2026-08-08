'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { REGION_STROKE_WIDTH } from './engine/map-constants'
import type { MapHoverTarget } from './engine/map-hover/target'
import { type MapRegionLayer, paintAt } from './engine/map-region/paint'

/** Props for {@link MapRegionsLit}: what the emphasis holds lit above the receded layer. @internal */
type MapRegionsLitProps = MapRegionLayer & {
	pointed: MapHoverTarget | null
	emphasis: string | null
}

/**
 * The lit copies above the receded layer — the chart marks' isolation
 * pattern: the layer dims as one group and the emphasised marks draw again
 * at full strength over it. A pointed region redraws alone; a legend focus
 * redraws its category. The copies are `pointer-events-none` and carry no
 * anchor attribute, so the base paths stay the hit targets and the scroll
 * resolve never sees a double; opaque fills over identical geometry cover
 * their dimmed originals exactly.
 *
 * @internal
 */
export function MapRegionsLit({
	pointed,
	emphasis,
	paths,
	regionCategory,
	paints,
}: MapRegionsLitProps) {
	// The lit set is the exact complement of the shared dim rule
	// (`mapMarkDimmed` in context.ts — change one, change both): the pointed
	// mark wins over a still-held legend focus, so a pointed region lights
	// alone, a pointed overlay entry lights nothing here (the whole layer
	// recedes behind it), else the focused category lights. Resolved by branch
	// rather than through the helper so a pointer crossing costs O(1), not a
	// per-region scan.
	const lit: number[] = []

	if (pointed !== null) {
		if (pointed.kind === 'region') lit.push(pointed.index)
	} else if (emphasis !== null) {
		for (const [index, d] of paths.entries()) {
			if (d === null) continue

			if (paintAt(paints, regionCategory[index] ?? null).groupId === emphasis) lit.push(index)
		}
	}

	if (lit.length === 0) return null

	return (
		<g data-slot="map-regions-lit" className="pointer-events-none">
			{lit.map((index) => {
				const paint = paintAt(paints, regionCategory[index] ?? null)

				return (
					<path
						key={index}
						d={paths[index] as string}
						fill={paint.fillColor}
						strokeWidth={REGION_STROKE_WIDTH}
						vectorEffect="non-scaling-stroke"
						// The pointed copy carries the hover emphasis statically: it is
						// the hovered region by definition, and `:hover` can't reach a
						// pointer-events-none element.
						className={cn(paint.className, pointed !== null && k.region.pointed)}
					/>
				)
			})}
		</g>
	)
}
