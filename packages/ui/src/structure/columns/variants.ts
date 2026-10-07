import { atBreakpoint, type Responsive, resolveResponsive } from '../../types'
import {
	type ResponsiveAlign,
	type ResponsiveGap,
	resolveAlign,
	resolveGap,
} from '../flex/variants'

/** The count of equal tracks in a row of {@link Columns}. */
export type ColumnCount = 1 | 2 | 3 | 4 | 6

/** {@link ColumnCount} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveColumnCount = Responsive<ColumnCount>

/** The `Ma` gap step between the cells per breakpoint, or a single value at all sizes; the Flex axis. */
export type ResponsiveColumnsGap = ResponsiveGap

/** The alignment of each cell in its row per breakpoint, or a single value at all sizes; the Flex axis. */
export type ResponsiveColumnsAlign = ResponsiveAlign

const countMap = {
	1: 'grid-cols-1',
	2: 'grid-cols-2',
	3: 'grid-cols-3',
	4: 'grid-cols-4',
	6: 'grid-cols-6',
} as const satisfies Record<ColumnCount, string>

/**
 * The template class for each breakpoint of `columns`.
 *
 * @internal
 */
export function resolveColumns(value: ResponsiveColumnCount | undefined): string[] {
	return resolveResponsive(value, (v, bp) => atBreakpoint(countMap[v], bp))
}

export { resolveAlign, resolveGap }
