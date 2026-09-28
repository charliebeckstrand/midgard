import type { ClassValue } from 'clsx'
import { createElement, type ReactElement } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { Placeholder } from './placeholder'

// Call sites pin `S` to the `size` type of their component, so the `size` prop
// only carries a size that the recipe defines. Skeletons are static leaves and
// read no context. A sized recipe takes its size from the explicit prop, with
// `md` as the default. A density recipe takes the step of its nearest density
// scope, and an explicit `size` makes it a scope. The composer of the loading
// tree (a Suspense fallback, `<ReadyReveal placeholder>`) knows the size and
// passes it.

type BaseSkeletonRecipe = {
	/** Base skeleton shape classes. */
	base: ClassValue
}

type SizedSkeletonRecipe<S extends DensityStep> = BaseSkeletonRecipe & {
	/**
	 * Per-size shape classes, keyed by the resolved size. `md` is required because
	 * it is the default an omitted `size` prop resolves to. A map without it would
	 * render a silhouette carrying no size class.
	 */
	size: Record<S | 'md', ClassValue>
}

type DensitySkeletonRecipe = BaseSkeletonRecipe & {
	/**
	 * Marks a silhouette that follows density: the base holds stepped classes,
	 * so the silhouette takes the step of its nearest density scope. An explicit
	 * `size` writes `data-density`, so the silhouette is its own scope.
	 */
	density: true
}

/**
 * Props of a {@link createSkeleton} component: `className` always, plus an
 * optional `size` when built from a sized recipe.
 */
export type SkeletonProps<S extends DensityStep = never> = [S] extends [never]
	? { className?: string }
	: { size?: S; className?: string }

/**
 * Build a skeleton component from a recipe's `skeleton` surface, rendering a
 * `<Placeholder>` that carries the recipe's shape classes.
 *
 * A sized recipe (`{ base, size }`) folds in the per-size class for the
 * explicit `size` prop (default `'md'`); the returned component takes an
 * optional `size` prop. A density recipe (`{ base, density }`) writes an
 * explicit `size` to `data-density`, and without `size` it follows the nearest
 * density scope. A base-only recipe (`{ base }`) has a fixed silhouette and
 * takes no `size` prop.
 *
 * Use only for skeletons whose entire body is that. Components that compose
 * more than a single placeholder — a count-keyed row (breadcrumb) — or fold in
 * extra state (Control's join-aware classes) keep writing their skeleton inline.
 *
 * @param skeleton - The recipe's `skeleton` surface: `{ base, size }` for a
 *   sized silhouette, `{ base, density }` for one that follows density, or
 *   `{ base }` for a fixed one.
 * @param name - `displayName` for the returned component.
 * @returns A static skeleton component rendering a `<Placeholder>` with the
 *   recipe's shape classes; it accepts a `size` prop only for a sized recipe.
 * @example
 *   export const ButtonSkeleton = createSkeleton(k.skeleton, 'ButtonSkeleton')
 *   export const RadioSkeleton = createSkeleton(k.skeleton, 'RadioSkeleton')
 */
export function createSkeleton(
	skeleton: DensitySkeletonRecipe,
	name: string,
): (props: SkeletonProps<DensityStep>) => ReactElement
export function createSkeleton<S extends DensityStep>(
	skeleton: SizedSkeletonRecipe<S>,
	name: string,
): (props: SkeletonProps<S>) => ReactElement
export function createSkeleton(
	skeleton: BaseSkeletonRecipe,
	name: string,
): (props: SkeletonProps) => ReactElement
export function createSkeleton<S extends DensityStep>(
	skeleton: BaseSkeletonRecipe | SizedSkeletonRecipe<S> | DensitySkeletonRecipe,
	name: string,
) {
	function Skeleton({ size, className }: { size?: S; className?: string }) {
		if ('density' in skeleton) {
			return createElement(Placeholder, {
				'data-density': size,
				className: cn(skeleton.base, className),
			})
		}

		const sizeClass = 'size' in skeleton ? skeleton.size[size ?? 'md'] : undefined

		return createElement(Placeholder, {
			className: cn(skeleton.base, sizeClass, className),
		})
	}

	Skeleton.displayName = name

	return Skeleton
}
