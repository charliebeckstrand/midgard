import type { ResponsiveAlign, ResponsiveDirection } from '../../../structure/flex/variants'
import { adaptive } from '../../../types'
import type { FormFiltersLayout } from './types'

/** The regions of a bar stack on a compact viewport, and share a row from medium. */
const STACK_DIRECTION = adaptive({ compact: 'col', medium: 'row' })

/** The fields of a stack start at the start, and line up on their bottom edges in a row. */
const STACK_ALIGN = adaptive({ compact: 'start', medium: 'end' })

/**
 * The flex axis of the regions of a bar, from its layout. It is a plain
 * function, so that `FormFiltersSkeleton` can read it in a server tree.
 *
 * @returns The `rail` flag, the `direction` and `align` that a `Flex` takes,
 * and the width class of each field.
 * @internal
 */
export function formFiltersAxis(layout: FormFiltersLayout): {
	rail: boolean
	direction: ResponsiveDirection
	align: ResponsiveAlign
	width: string
} {
	const rail = layout === 'rail'

	return {
		rail,
		// One row at every width on a rail, a column on a narrow screen otherwise.
		direction: rail ? 'row' : STACK_DIRECTION,
		// A row lines its fields up on their bottom edges, so a label-less Clear
		// sits on the controls and not on the middle of a label and its control. A
		// rail is a row at every width. A stack is a row from the breakpoint where
		// `direction` turns to a row.
		align: rail ? 'end' : STACK_ALIGN,
		// A stacked field fills its column. A rail's field keeps the width that it
		// was given and does not shrink, so the row overflows and scrolls.
		width: rail ? 'shrink-0' : 'w-full',
	}
}
