import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/control'
import { k } from '../../recipes/kata/control'
import { Placeholder } from '../placeholder'

/** Props for {@link ControlSkeleton}: the control `size` plus `className`. */
export type ControlSkeletonProps = {
	/**
	 * The density step. Omit it to take the step of the nearest density scope,
	 * as the control does. A step makes the silhouette a density scope.
	 */
	size?: ScaleStep<typeof scale>
	className?: string
}

/**
 * A placeholder for a framed control, such as an Input or a Combobox, while it
 * loads. Static leaf: an explicit `size` writes `data-density`, and with no
 * `size` the silhouette follows the nearest density scope.
 *
 * @remarks
 * The joined silhouette comes from CSS alone. In a `<Group>`, the join
 * classes of the group flatten the inner corners of the skeleton, and the
 * group sets how it shares the length of the group. Outside a group, it fills
 * its parent.
 */
export function ControlSkeleton({ size, className }: ControlSkeletonProps) {
	return (
		<Placeholder data-density={size} className={cn(k.skeleton.base, k.skeleton.fill, className)} />
	)
}
