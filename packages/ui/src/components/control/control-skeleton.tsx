import { cn } from '../../core'
import { k } from '../../recipes/kata/control'
import type { GroupStampProps } from '../../types/group-stamp'
import { Placeholder } from '../placeholder'
import type { ControlSize } from './context'

/** Props for {@link ControlSkeleton}: the control `size` plus `className`. */
export type ControlSkeletonProps = GroupStampProps & {
	/**
	 * Silhouette density step.
	 *
	 * @defaultValue `'md'`
	 */
	size?: ControlSize
	className?: string
}

/**
 * Control-shaped placeholder. Static leaf: `size` is explicit and mirrors the
 * real control's prop.
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
	const resolvedSize = size ?? 'md'

	const joined = dataGroup !== undefined

	return (
		<Placeholder
			data-group={dataGroup}
			data-group-orientation={dataGroupOrientation}
			className={cn(
				k.skeleton.base,
				joined ? k.skeleton.group[resolvedSize] : k.skeleton.full,
				k.skeleton.size[resolvedSize],
				className,
			)}
		/>
	)
}
