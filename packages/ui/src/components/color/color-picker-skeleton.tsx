import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/color-picker'
import { k } from '../../recipes/kata/color-picker'
import { Placeholder } from '../placeholder'

/** Props for {@link ColorPickerSkeleton}: the `size` and the `alpha` of the picker, and `className`. */
export type ColorPickerSkeletonProps = {
	/**
	 * The density step. Omit it to take the step of the nearest density scope,
	 * as the picker does. A step makes the silhouette a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/**
	 * Set it when the picker has `alpha`, so the silhouette is as wide as an
	 * eight-digit hex value.
	 *
	 * @defaultValue false
	 */
	alpha?: boolean
	className?: string
}

/**
 * Loading placeholder for a {@link ColorPicker}. It is as wide as the trigger
 * at the same `size` and `alpha`: the swatch and the hex value, not the width
 * of its parent. Compose it in loading trees in place of `<ColorPicker>`.
 */
export function ColorPickerSkeleton({ size, alpha = false, className }: ColorPickerSkeletonProps) {
	return (
		<Placeholder data-density={size} className={cn(k.skeleton.base, className)}>
			<span className={cn(k.skeleton.swatch)} />
			<span
				className={cn(k.skeleton.value.base, alpha ? k.skeleton.value.alpha : k.skeleton.value.hex)}
			/>
		</Placeholder>
	)
}
