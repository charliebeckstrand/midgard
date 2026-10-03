import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { k, type scale } from '../../recipes/kata/heading'
import { Placeholder } from '../placeholder'
import type { HeadingLevel } from './heading'

/** Props for {@link HeadingSkeleton}: mirrors {@link HeadingProps} `level` and `size` to match the placeholder height. */
export type HeadingSkeletonProps = {
	/** @defaultValue 1 */
	level?: HeadingLevel
	/**
	 * The density step. Omit it to take the step of the nearest density scope.
	 * A step makes the silhouette a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/**
	 * Render a `span` that sits inside a real heading, one em tall, in place of a
	 * block. Use it when the heading renders at once and only its text loads, as
	 * in `<CardTitle><HeadingSkeleton inline /></CardTitle>`. The heading then
	 * keeps its settled height. `level` and `size` do not apply, because the
	 * heading around the span sets the font size.
	 * @defaultValue false
	 */
	inline?: boolean
	className?: string
}

/**
 * Heading-shaped placeholder. Its height tracks the rung of the heading at each
 * step, and it takes the step of the nearest density scope, as the heading
 * does. Keyed off the level, so it does not use the `createSkeleton` factory.
 * With `inline`, it is a span that sits inside a real heading.
 * @remarks Static leaf: renders in React Server Components.
 * @see {@link Heading}
 */
export function HeadingSkeleton({
	level = 1,
	size,
	inline = false,
	className,
}: HeadingSkeletonProps) {
	if (inline) return <Placeholder as="span" className={cn(k.skeleton.inline, className)} />

	return (
		<Placeholder
			data-density={size}
			className={cn(k.skeleton.base, k.skeleton.ramp[level], className)}
		/>
	)
}
