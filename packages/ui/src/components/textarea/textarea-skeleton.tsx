import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/textarea'
import { k } from '../../recipes/kata/textarea'
import { Placeholder } from '../placeholder'

/** Props for {@link TextareaSkeleton}. */
export type TextareaSkeletonProps = {
	/**
	 * Visible rows the control reserves; drives the placeholder height.
	 * @defaultValue 3
	 */
	rows?: number
	/**
	 * The density step. Omit it to take the step of the nearest density scope,
	 * as the textarea does. A step makes the silhouette a density scope.
	 */
	size?: ScaleStep<typeof scale>
	className?: string
}

/**
 * Textarea-shaped placeholder: `rows` lines of the text of a textarea, plus its
 * vertical padding, at the step of the nearest density scope. The height is a
 * count of lines, so it does not use the `createSkeleton` factory.
 */
export function TextareaSkeleton({ rows = 3, size, className }: TextareaSkeletonProps) {
	return (
		<Placeholder
			data-density={size}
			className={cn(k.skeleton.base, className)}
			style={{ height: `${rows}lh` }}
		/>
	)
}
