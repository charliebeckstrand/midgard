import type { ClassValue } from 'clsx'
import { createElement, type ReactElement } from 'react'
import { cn } from '../../core'
import { useSize } from '../../primitives/density'
import { Placeholder } from './placeholder'

// Resolved through the Density cascade via `useSize`. Call sites pin `S` to
// their kata's `VariantProps['size']`.
type ResolvableSize = NonNullable<Parameters<typeof useSize>[0]>

type BaseSkeletonRecipe = {
	/** Base skeleton shape classes. */
	base: ClassValue
}

type SizedSkeletonRecipe<S extends ResolvableSize> = BaseSkeletonRecipe & {
	/** Per-size shape classes, keyed by the resolved size. */
	size: Record<S, ClassValue>
}

export type SkeletonProps<S extends ResolvableSize = never> = [S] extends [never]
	? { className?: string }
	: { size?: S; className?: string }

/**
 * Build a skeleton component from a recipe's `skeleton` surface, rendering a
 * `<Placeholder>` that carries the recipe's shape classes.
 *
 * A sized recipe (`{ base, size }`) resolves its size through the Density
 * cascade (`useSize`) and folds in the matching per-size class; the returned
 * component takes an optional `size` prop. A base-only recipe (`{ base }`)
 * has a fixed silhouette and takes no `size` prop.
 *
 * Use only for skeletons whose entire body is that. Components that wrap the
 * placeholder (Avatar's `DensityScope`) or fold in extra state (Control's
 * join-aware classes) keep writing their skeleton inline.
 *
 * @example
 *   export const ButtonSkeleton = createSkeleton(k.skeleton, 'ButtonSkeleton')
 *   export const RadioSkeleton = createSkeleton(k.skeleton, 'RadioSkeleton')
 */
export function createSkeleton<S extends ResolvableSize>(
	skeleton: SizedSkeletonRecipe<S>,
	name: string,
): (props: SkeletonProps<S>) => ReactElement
export function createSkeleton(
	skeleton: BaseSkeletonRecipe,
	name: string,
): (props: SkeletonProps) => ReactElement
export function createSkeleton<S extends ResolvableSize>(
	skeleton: BaseSkeletonRecipe | SizedSkeletonRecipe<S>,
	name: string,
) {
	function Skeleton({ size, className }: { size?: S; className?: string }) {
		const resolvedSize = useSize(size)

		const sizeClass = 'size' in skeleton ? skeleton.size[resolvedSize] : undefined

		return createElement(Placeholder, {
			className: cn(skeleton.base, sizeClass, className),
		})
	}

	Skeleton.displayName = name

	return Skeleton
}
