import { Fragment } from 'react'
import { k } from '../../recipes/kata/description-list'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'
import { DESCRIPTION_LIST_ORIENTATION, type DescriptionListVariants } from './description-list'

/** Props for {@link DescriptionListSkeleton}: the pair count and the `orientation` of the list. */
export type DescriptionListSkeletonProps = DescriptionListVariants & {
	/**
	 * Term and details pairs to render.
	 * @defaultValue 3
	 */
	rows?: number
	className?: string
}

/**
 * A placeholder for a DescriptionList while it loads. It shows `rows` pairs of
 * a term line and a details line, in the layout of the `orientation`. Keyed off
 * the pair count, so it does not use the size-driven `createSkeleton` factory.
 * It follows density as the list does: the lines and the cell padding take the
 * step of the nearest density scope.
 *
 * @remarks Static leaf: renders in React Server Components. It renders the
 * `dl`, `dt`, and `dd` elements of the real list, so the list projects the
 * same layout onto its cells. A wrapper `div` is `aria-hidden`, so assistive
 * technology does not find a list of empty terms.
 * @see {@link DescriptionList}
 */
export function DescriptionListSkeleton({
	rows = 3,
	orientation = DESCRIPTION_LIST_ORIENTATION,
	className,
}: DescriptionListSkeletonProps) {
	const rowKeys = rangeKeys(rows, 'row')

	// The wrapper hides the list, so assistive technology finds no empty terms.
	return (
		<div aria-hidden="true" className={className}>
			<dl className={k({ orientation }).base}>
				{rowKeys.map((rowKey) => (
					<Fragment key={rowKey}>
						<dt>
							<Placeholder className={k.skeleton.term} />
						</dt>
						<dd>
							<Placeholder className={k.skeleton.details} />
						</dd>
					</Fragment>
				))}
			</dl>
		</div>
	)
}
