import type { ResponsiveAlign, ResponsiveDirection } from '../../structure/flex/variants'
import type { FiltersLayout } from './context'

/**
 * The flex axis of the regions of a bar, from its layout. It is a plain
 * function, so that {@link FiltersSkeleton} can read it in a server tree.
 *
 * @returns The `rail` flag, and the `direction` and `align` that a `Flex` takes.
 * @internal
 */
export function filtersAxis(layout: FiltersLayout): {
	rail: boolean
	direction: ResponsiveDirection
	align: ResponsiveAlign
} {
	const rail = layout === 'rail'

	return {
		rail,
		// One row at every width on a rail, a column on a narrow screen otherwise.
		direction: rail ? 'row' : ({ initial: 'col', sm: 'row' } as const),
		// A rail's controls are all the same height, so they center. A stack lines
		// its fields up on their bottom edges once it is a row, at the breakpoint
		// where `direction` turns to a row.
		align: rail ? 'center' : ({ initial: 'start', sm: 'end' } as const),
	}
}
