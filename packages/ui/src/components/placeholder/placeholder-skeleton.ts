import type { ClassValue } from 'clsx'
import { createElement } from 'react'
import { cn } from '../../core'
import { useSizeWide } from '../../primitives/density'
import { Placeholder } from './placeholder'

// The size domain is whatever the Density cascade can resolve, derived from
// useSizeWide rather than importing kiso's Ma directly (the component Ma
// import boundary forbids that). Call sites pin S to their kata's
// VariantProps['size'].
type ResolvableSize = NonNullable<Parameters<typeof useSizeWide>[0]>

type SkeletonRecipe<S extends ResolvableSize> = {
	/** Base skeleton shape classes. */
	base: ClassValue
	/** Per-size shape classes, keyed by the resolved size. */
	size: Record<S, ClassValue>
}

export type SkeletonProps<S extends ResolvableSize> = {
	size?: S
	className?: string
}

/**
 * Build a size-aware skeleton component from a recipe's `skeleton` surface.
 * Resolves the size through the Density cascade (`useSizeWide`) and renders a
 * `<Placeholder>` carrying the recipe's base + per-size shape classes.
 *
 * Use only for skeletons whose entire body is that. Components that wrap the
 * placeholder (Avatar's `DensityScope`) or fold in extra state (Control's
 * join-aware classes) keep writing their skeleton inline.
 *
 * @example
 *   export const BadgeSkeleton = createSkeleton(k.skeleton, 'BadgeSkeleton')
 */
export function createSkeleton<S extends ResolvableSize>(
	skeleton: SkeletonRecipe<S>,
	name: string,
) {
	function Skeleton({ size, className }: SkeletonProps<S>) {
		const resolvedSize = useSizeWide(size)

		return createElement(Placeholder, {
			className: cn(skeleton.base, skeleton.size[resolvedSize], className),
		})
	}

	Skeleton.displayName = name

	return Skeleton
}
