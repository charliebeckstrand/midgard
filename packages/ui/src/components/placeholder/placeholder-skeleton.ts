import type { ClassValue } from 'clsx'
import { createElement, type ReactElement } from 'react'
import { cn } from '../../core'
import { Placeholder } from './placeholder'

// The `Ma` scale, which components must not import from the recipes barrel.
// Call sites pin `S` to their kata's `VariantProps['size']`, so the `size` prop
// only ever carries a key the recipe's own `size` map defines. Skeletons are
// static leaves: size comes from the explicit prop (default `md`), never from
// context. The loading tree's composer (a Suspense fallback,
// `<ReadyReveal placeholder>`) knows the size and passes it.
type ResolvableSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type BaseSkeletonRecipe = {
	/** Base skeleton shape classes. */
	base: ClassValue
}

type SizedSkeletonRecipe<S extends ResolvableSize> = BaseSkeletonRecipe & {
	/** Per-size shape classes, keyed by the resolved size. */
	size: Record<S, ClassValue>
}

/**
 * Props of a {@link createSkeleton} component: `className` always, plus an
 * optional `size` when built from a sized recipe.
 */
export type SkeletonProps<S extends ResolvableSize = never> = [S] extends [never]
	? { className?: string }
	: { size?: S; className?: string }

/**
 * Build a skeleton component from a recipe's `skeleton` surface, rendering a
 * `<Placeholder>` that carries the recipe's shape classes.
 *
 * A sized recipe (`{ base, size }`) folds in the per-size class for the
 * explicit `size` prop (default `'md'`); the returned component takes an
 * optional `size` prop. A base-only recipe (`{ base }`) has a fixed
 * silhouette and takes no `size` prop.
 *
 * Use only for skeletons whose entire body is that. Components that compose
 * more than a single placeholder — a count-keyed row (breadcrumb) — or fold in
 * extra state (Control's join-aware classes) keep writing their skeleton inline.
 *
 * @param skeleton - The recipe's `skeleton` surface: `{ base, size }` for a
 *   sized silhouette or `{ base }` for a fixed one.
 * @param name - `displayName` for the returned component.
 * @returns A static skeleton component rendering a `<Placeholder>` with the
 *   recipe's shape classes; it accepts a `size` prop only for a sized recipe.
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
			'size' in skeleton ? (skeleton.size as Record<string, ClassValue>)[resolvedSize] : undefined

		return createElement(Placeholder, {
			className: cn(skeleton.base, sizeClass, className),
		})
	}

	Skeleton.displayName = name

	return Skeleton
}
