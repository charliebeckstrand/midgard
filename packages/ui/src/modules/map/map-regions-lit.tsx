'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { useMapZoomScale } from './context'
import { REGION_EMPHASIZED_STROKE_WIDTH } from './engine/map-constants'
import type { MapHoverTarget } from './engine/map-hover/target'
import { type MapRegionLayer, paintAt } from './engine/map-region/paint'

/** Props for {@link MapRegionsLit}: what the emphasis holds lit above the receded layer. @internal */
type MapRegionsLitProps = MapRegionLayer & {
	pointed: MapHoverTarget | null
	emphasis: string | null
}

/**
 * The lit copies above the receded layer, the chart marks' isolation
 * pattern. The layer dims as one group, and the emphasized marks draw again
 * at full strength over it. A pointed region redraws alone; a legend focus
 * redraws its category. The copies are `pointer-events-none` and carry no
 * anchor attribute. The base paths therefore stay the hit targets, and the
 * scroll resolve never sees a double. Opaque fills over identical geometry
 * cover their dimmed originals exactly.
 *
 * A legend emphasis also outlines its lit regions ({@link MapRegionsEmphasized}).
 * A pointed region does not, because the hover brightness already marks it.
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
	// (`mapMarkDimmed` in engine/map-hover/target.ts: change one, change
	// both): the pointed mark wins over a still-held legend focus, so a
	// pointed region lights alone, a pointed overlay entry lights nothing
	// here (the whole layer recedes behind it), else the focused category
	// lights. Resolved by branch rather than through the helper so a pointer
	// crossing costs O(1), not a per-region scan.
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
		<>
			<g data-slot="map-regions-lit" className="pointer-events-none">
				{lit.map((index) => {
					const paint = paintAt(paints, regionCategory[index] ?? null)

					return (
						<path
							key={index}
							d={paths[index] as string}
							fill={paint.fillColor}
							// No width of its own, as the base path it copies has none: both
							// inherit the seam from the group above them.
							// The pointed copy carries the hover emphasis statically: it is
							// the hovered region by definition, and `:hover` can't reach a
							// pointer-events-none element.
							className={cn(paint.className, pointed !== null && k.region.pointed)}
						/>
					)
				})}
			</g>

			{pointed === null && <MapRegionsEmphasized lit={lit} paths={paths} />}
		</>
	)
}

/**
 * The outlines on the regions a legend emphasis holds lit. They draw in one
 * pass after every lit fill, so a lit neighbor cannot cover half of an outline
 * on a shared border.
 *
 * Its own component for the reason {@link MapRegionSelected} gives: the width is
 * not the inherited hairline, so it reads the zoom scale, and only this group
 * re-renders on a zoom notch.
 *
 * @internal
 */
function MapRegionsEmphasized({ lit, paths }: { lit: number[]; paths: (string | null)[] }) {
	const unitsPerPixel = useMapZoomScale()

	return (
		<g
			data-slot="map-regions-emphasized"
			fill="none"
			strokeWidth={REGION_EMPHASIZED_STROKE_WIDTH * unitsPerPixel}
			className={cn('pointer-events-none', ...k.region.emphasized)}
		>
			{lit.map((index) => (
				<path key={index} d={paths[index] as string} />
			))}
		</g>
	)
}
