import { cn } from '../../core'
import { k } from '../../recipes/kata/control'
import { Placeholder } from '../placeholder'
import type { ControlSize } from './context'

/** Props for {@link ControlSkeleton}: the control `size` and the `joined` group flag plus `className`. */
export type ControlSkeletonProps = {
	/**
	 * Silhouette density step.
	 *
	 * @defaultValue `'md'`
	 */
	size?: ControlSize
	/**
	 * Renders the grouped (joined) silhouette; pair with controls inside a `<Group>`.
	 *
	 * @defaultValue `false`
	 */
	joined?: boolean
	className?: string
}

/**
 * Control-shaped placeholder. Static leaf: `size` and `joined` are explicit
 * and mirror the real control's props.
 */
export function ControlSkeleton({ size, joined = false, className }: ControlSkeletonProps) {
	const resolvedSize = size ?? 'md'

	return (
		<Placeholder
			className={cn(
				k.skeleton.base,
				joined ? k.skeleton.group[resolvedSize] : k.skeleton.full,
				k.skeleton.size[resolvedSize],
				className,
			)}
		/>
	)
}
