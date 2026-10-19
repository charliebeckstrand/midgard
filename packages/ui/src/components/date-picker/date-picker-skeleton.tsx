import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/date-picker'
import { k } from '../../recipes/kata/date-picker'
import { Placeholder } from '../placeholder'

/** Props for {@link DatePickerSkeleton}: the `size` and the `range` of the picker, and `className`. */
export type DatePickerSkeletonProps = {
	/**
	 * The density step. Omit it to take the step of the nearest density scope,
	 * as the picker does. A step makes the silhouette a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/**
	 * Widens the silhouette to two dates. Set it when the picker has `range`.
	 *
	 * @defaultValue false
	 */
	range?: boolean
	className?: string
}

/**
 * A placeholder for a {@link DatePicker} while it loads. It has the height of the
 * trigger at the same `size`. It is as wide as a trigger that shows a date such
 * as 6/15/2026, or two dates when `range` is set. It does not fill its parent.
 * A date with fewer or more digits makes the trigger some pixels narrower or
 * wider.
 */
export function DatePickerSkeleton({ size, range = false, className }: DatePickerSkeletonProps) {
	return (
		<Placeholder data-density={size} className={cn(k.skeleton.base, className)}>
			<span
				className={cn(
					k.skeleton.value.base,
					range ? k.skeleton.value.range : k.skeleton.value.date,
				)}
			/>
			<span data-density="slot" className={cn(k.skeleton.icon)} />
		</Placeholder>
	)
}
