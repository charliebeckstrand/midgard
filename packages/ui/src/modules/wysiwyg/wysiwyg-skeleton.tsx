import { Placeholder } from '../../components/placeholder'
import { cn } from '../../core/cn'
import type { ScaleStep } from '../../core/density/scale'
import { k, type scale } from '../../recipes/kata/wysiwyg'

/** Props for {@link WysiwygSkeleton}. */
export type WysiwygSkeletonProps = {
	/**
	 * The lines that the field holds at its minimum height.
	 * @defaultValue 3
	 */
	rows?: number
	/**
	 * The density step. Omit it to take the step of the nearest density scope,
	 * as the field does. A step makes the silhouette a density scope.
	 */
	size?: ScaleStep<typeof scale>
	className?: string
}

/**
 * A placeholder for a {@link Wysiwyg} while it loads: `rows` lines of text and
 * the padding of the field, as the silhouette of a Textarea has.
 */
export function WysiwygSkeleton({ rows = 3, size, className }: WysiwygSkeletonProps) {
	return (
		<Placeholder data-density={size} className={cn(k.skeleton.base, className)}>
			<span className={k.skeleton.strut} style={{ height: `${rows}lh` }} />
		</Placeholder>
	)
}
