import { cn } from '../../core'
import { Flex } from '../../structure/flex'
import { rangeKeys } from '../../utilities'
import { ControlSkeleton } from '../control'
import type { FiltersLayout } from './context'
import { filtersAxis } from './filters-axis'

/** Props for {@link FiltersSkeleton}: the field count, the `layout` of the bar, and the classes of each field and of the bar. */
export type FiltersSkeletonProps = {
	/**
	 * Field placeholders to render.
	 * @defaultValue 3
	 */
	fields?: number
	/**
	 * The layout of the bar it stands in for.
	 * @defaultValue 'stack'
	 */
	layout?: FiltersLayout
	/** Classes for each field placeholder, such as the width that the real fields have. */
	fieldClassName?: string
	/** Classes for the bar, such as the padding that the real row has. */
	className?: string
}

/**
 * Filter-bar-shaped placeholder: one control placeholder for each field, on the
 * axis of the `layout`. A `rail` holds one row and clips the fields that do not
 * fit. A `stack` drops to a column on a narrow screen, as the real bar does.
 * Keyed off the field count rather than a size step; it does not use the
 * size-driven `createSkeleton` factory.
 *
 * @remarks Static leaf: renders in React Server Components.
 * @see {@link Filters}
 */
export function FiltersSkeleton({
	fields = 3,
	layout = 'stack',
	fieldClassName,
	className,
}: FiltersSkeletonProps) {
	const { rail, direction, align } = filtersAxis(layout)

	return (
		<Flex
			direction={direction}
			gap="sm"
			align={align}
			full
			className={cn(rail && 'overflow-hidden', className)}
		>
			{rangeKeys(fields, 'field').map((fieldKey) => (
				<ControlSkeleton
					key={fieldKey}
					className={cn(rail ? 'shrink-0' : 'w-full', fieldClassName)}
				/>
			))}
		</Flex>
	)
}
