import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/color-panel'
import { k } from '../../recipes/kata/color-panel'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'
import { DEFAULT_SWATCHES } from './color-constants'

/** Props for {@link ColorPanelSkeleton}: mirrors the `alpha`, `swatches`, and `size` of {@link ColorPanelProps}. */
export type ColorPanelSkeletonProps = {
	/**
	 * Reserve the alpha slider, as a panel with `alpha` draws it.
	 * @defaultValue false
	 */
	alpha?: boolean
	/**
	 * The preset swatches of the panel, or `false` for none. The silhouette
	 * reserves the rows of the swatch grid that holds them.
	 * @defaultValue {@link DEFAULT_SWATCHES}
	 */
	swatches?: readonly string[] | false
	/**
	 * The density step. Omit it to take the step of the nearest density scope,
	 * as the panel does. A step makes the silhouette a density scope.
	 */
	size?: ScaleStep<typeof scale>
	className?: string
}

/**
 * Color-panel-shaped loading placeholder: one block over empty rows that have
 * the structure of the real panel. The color area, the slider stack, the
 * preview row with the channel inputs, and the swatch grid come from the
 * color-panel recipes. So the block has the box of a real panel at each step,
 * with the same `alpha` and `swatches`. The silhouette follows those props as
 * well as the size step, so it does not use the `createSkeleton` factory.
 * Compose it in loading trees in place of `<ColorPanel>`.
 *
 * @remarks Static leaf: renders in React Server Components.
 * @see {@link ColorPanel}
 */
export function ColorPanelSkeleton({
	alpha = false,
	swatches = DEFAULT_SWATCHES,
	size,
	className,
}: ColorPanelSkeletonProps) {
	// One empty cell for each swatch. The grid then has the rows of the real grid,
	// and each row takes the height of its square cells.
	const cells = rangeKeys(swatches ? swatches.length : 0, 'swatch')

	return (
		<div data-density={size} aria-hidden="true" className={cn(k(), 'relative', className)}>
			<Placeholder className="absolute inset-0 size-full" />

			<div className={k.skeleton.area} />

			<div className={k.sliders}>
				<div className={k.skeleton.track} />
				{alpha && <div className={k.skeleton.track} />}
			</div>

			<div className={k.skeleton.fields} />

			{cells.length > 0 && (
				<div className={k.swatches}>
					{cells.map((cellKey) => (
						<div key={cellKey} className={k.skeleton.swatch} />
					))}
				</div>
			)}
		</div>
	)
}
