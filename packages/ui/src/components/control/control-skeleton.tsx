import { cn } from '../../core'
import type { ControlStep } from '../../core/density'
import { k } from '../../recipes/kata/control'
import type { GroupStampProps } from '../../types/group-stamp'
import { Placeholder } from '../placeholder'

/** Props for {@link ControlSkeleton}: the control `size` plus `className`. */
export type ControlSkeletonProps = GroupStampProps & {
	/**
	 * The density step. Omit it to take the step of the nearest density scope,
	 * as the control does. A step makes the silhouette a density scope.
	 */
	size?: ControlStep
	className?: string
}

/**
 * Control-shaped placeholder. Static leaf: an explicit `size` writes
 * `data-density`, and with no `size` the silhouette follows the nearest
 * density scope.
 *
 * @remarks
 * The joined silhouette is derived, not asked for. A `<Group>` stamps
 * `data-group` onto every child, this one included. A skeleton inside a group
 * therefore draws the joined shape, and one outside draws the full one. It
 * used to take a `joined` boolean that echoed the stamp it was handed and
 * dropped.
 */
export function ControlSkeleton({
	size,
	className,
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
}: ControlSkeletonProps) {
	const joined = dataGroup !== undefined

	return (
		<Placeholder
			data-density={size}
			data-group={dataGroup}
			data-group-orientation={dataGroupOrientation}
			className={cn(k.skeleton.base, joined ? k.skeleton.group : k.skeleton.full, className)}
		/>
	)
}
