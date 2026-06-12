import type { ClassValue } from 'clsx'
import { createElement, type ReactElement } from 'react'
import { cn } from '../../core'
import { Placeholder } from './placeholder'

// Narrowest-to-widest order of the resolvable sizes; also the source of the
// `ResolvableSize` union (the `Ma` scale, which components must not import
// from the recipes barrel). A skeleton recipe's `size` map is keyed by Step
// (sm/md/lg), but the `size` prop can carry a sub-Step value (xs/xl) on
// `Ma`-scale components; those clamp to the nearest key the recipe defines.
const MA_ORDER = ['xs', 'sm', 'md', 'lg', 'xl'] as const

// Call sites pin `S` to their kata's `VariantProps['size']`. Skeletons are
// static leaves: size comes from the explicit prop (default `md`), never from
// context. Loading trees are composed explicitly (Suspense fallbacks,
// `<ReadyReveal placeholder>`), where the composer knows the size.
type ResolvableSize = (typeof MA_ORDER)[number]

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

function sizeClassFor(sizeMap: Record<string, ClassValue>, resolved: string): ClassValue {
	if (resolved in sizeMap) return sizeMap[resolved]

	const index = MA_ORDER.indexOf(resolved as (typeof MA_ORDER)[number])

	if (index === -1) return undefined

	for (let distance = 1; distance < MA_ORDER.length; distance++) {
		const lower = MA_ORDER[index - distance]

		if (lower && lower in sizeMap) return sizeMap[lower]

		const higher = MA_ORDER[index + distance]

		if (higher && higher in sizeMap) return sizeMap[higher]
	}

	return undefined
}

/**
 * Build a skeleton component from a recipe's `skeleton` surface, rendering a
 * `<Placeholder>` that carries the recipe's shape classes.
 *
 * A sized recipe (`{ base, size }`) folds in the per-size class for the
 * explicit `size` prop (default `'md'`); the returned component takes an
 * optional `size` prop. A base-only recipe (`{ base }`) has a fixed
 * silhouette and takes no `size` prop.
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
		const resolvedSize = size ?? 'md'

		const sizeClass =
			'size' in skeleton
				? sizeClassFor(skeleton.size as Record<string, ClassValue>, resolvedSize)
				: undefined

		return createElement(Placeholder, {
			className: cn(skeleton.base, sizeClass, className),
		})
	}

	Skeleton.displayName = name

	return Skeleton
}
