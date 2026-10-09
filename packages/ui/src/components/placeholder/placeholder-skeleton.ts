import type { ClassValue } from 'clsx'
import { createElement, Fragment, type ReactElement } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { rangeKeys } from '../../utilities'
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
	/**
	 * Marks the silhouette of an inline component. It renders as an inline-block `<span>`, so it
	 * flows where the component would, a line of text included. A `div` there is invalid inside a
	 * `<p>`: the parser closes the paragraph at it, and a server-rendered tree fails to hydrate.
	 */
	inline?: true
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
	: {
			/** The size of the component that the silhouette stands in for. */
			size?: S
			className?: string
		}

/**
 * Props of a {@link createSkeleton} component built from a sized recipe: the
 * {@link SkeletonProps}, with the default of `size`.
 * @internal
 */
type SizedSkeletonProps<S extends DensityStep> = {
	/**
	 * The size of the component that the silhouette stands in for.
	 * @defaultValue 'md'
	 */
	size?: S
	className?: string
}

/**
 * Build a skeleton component from a recipe's `skeleton` surface, rendering a
 * `<Placeholder>` that carries the recipe's shape classes.
 *
 * A sized recipe (`{ base, size }`) folds in the per-size class for the
 * explicit `size` prop (default `'md'`); the returned component takes an
 * optional `size` prop. A density recipe (`{ base, density }`) writes an
 * explicit `size` to `data-density`, and without `size` it follows the nearest
 * density scope. Its type argument limits the `size`, such as the `ScaleStep`
 * of a control. A base-only recipe (`{ base }`) has a fixed silhouette and
 * takes no `size` prop. An `inline` recipe renders an inline-block `<span>`.
 *
 * Use only for skeletons whose entire body is that. A count-keyed row of
 * placeholders, such as the breadcrumb, uses {@link renderRowSkeleton}. A
 * skeleton that folds in extra state, such as the join-aware classes of
 * Control, writes its body inline.
 *
 * @param skeleton - The recipe's `skeleton` surface: `{ base, size }` for a
 *   sized silhouette, `{ base, density }` for one that follows density, or
 *   `{ base }` for a fixed one.
 * @param name - `displayName` for the returned component.
 * @returns A static skeleton component rendering a `<Placeholder>` with the
 *   recipe's shape classes; it accepts a `size` prop only for a sized recipe.
 * @example
 *   export const BadgeSkeleton = createSkeleton(k.skeleton, 'BadgeSkeleton')
 *   export const RadioSkeleton = createSkeleton<ScaleStep<typeof scale>>(k.skeleton, 'RadioSkeleton')
 */
export function createSkeleton<S extends DensityStep = DensityStep>(
	skeleton: DensitySkeletonRecipe,
	name: string,
): (props: SkeletonProps<S>) => ReactElement
export function createSkeleton<S extends DensityStep>(
	skeleton: SizedSkeletonRecipe<S>,
	name: string,
): (props: SizedSkeletonProps<S>) => ReactElement
export function createSkeleton(
	skeleton: BaseSkeletonRecipe,
	name: string,
): (props: SkeletonProps) => ReactElement
export function createSkeleton<S extends DensityStep>(
	skeleton: BaseSkeletonRecipe | SizedSkeletonRecipe<S> | DensitySkeletonRecipe,
	name: string,
) {
	function Skeleton({ size, className }: { size?: S; className?: string }) {
		const inline = skeleton.inline === true

		const sizeClass = 'size' in skeleton ? skeleton.size[size ?? 'md'] : undefined

		return createElement(Placeholder, {
			as: inline ? 'span' : 'div',
			'data-density': 'density' in skeleton ? size : undefined,
			className: cn(inline && 'inline-block align-middle', skeleton.base, sizeClass, className),
		})
	}

	Skeleton.displayName = name

	return Skeleton
}

/**
 * Options of {@link renderRowSkeleton}: the placeholder count, the classes of
 * the row, of each placeholder, and of each separator, and the element that
 * they render as.
 * @internal
 */
export type RowSkeletonOptions = {
	/** Placeholders to render. */
	count: number
	/** Classes of the row, the `className` of the skeleton included. */
	root: ClassValue
	/**
	 * Classes of each placeholder. A function gets the index of the placeholder,
	 * so the classes can change along the row.
	 */
	item: ClassValue | ((index: number) => ClassValue)
	/** Classes of the placeholder between two items. Omit it to put no separator in the row. */
	separator?: ClassValue
	/**
	 * The density step that the row writes to `data-density`. Omit it to follow
	 * the nearest density scope.
	 */
	density?: DensityStep
	/**
	 * The element of the row and of each placeholder. A `span` row stands in for
	 * an inline component, where a `div` is invalid inside a `<p>`.
	 * @defaultValue 'div'
	 */
	as?: 'div' | 'span'
}

/**
 * Render the body of a count-keyed row skeleton: a row that holds `count`
 * placeholders, with a separator placeholder between two items when
 * `separator` is set. The skeleton keeps its own props and defaults, and calls
 * this function from its body. So the function adds no component to the tree,
 * and the skeleton stays a static leaf.
 *
 * Use it only when each item is one placeholder. A skeleton whose item holds
 * more than one element, such as the step of the stepper, writes its row
 * inline.
 *
 * @param options - The count, the classes, and the element of the row.
 * @returns The row element.
 * @example
 *   return renderRowSkeleton({
 *     count: crumbs,
 *     root: [k.list(), className],
 *     item: k.skeleton.item,
 *     separator: k.skeleton.separator,
 *   })
 * @internal
 */
export function renderRowSkeleton({
	count,
	root,
	item,
	separator,
	density,
	as = 'div',
}: RowSkeletonOptions): ReactElement {
	const items = rangeKeys(count, 'item').map((key, index) =>
		createElement(
			Fragment,
			{ key },
			index > 0 && separator !== undefined
				? createElement(Placeholder, { as, className: cn(separator) })
				: null,
			createElement(Placeholder, {
				as,
				className: cn(typeof item === 'function' ? item(index) : item),
			}),
		),
	)

	return createElement(as, { 'data-density': density, className: cn(root) }, items)
}
