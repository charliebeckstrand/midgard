import type { Responsive } from '../../types'
import type { ResponsiveAlign, ResponsiveGap } from '../flex/variants'

/** The count of equal tracks in a row of {@link Columns}. */
export type ColumnCount = 1 | 2 | 3 | 4 | 6

/** {@link ColumnCount} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveColumnCount = Responsive<ColumnCount>

/** The `Ma` gap step between the cells per breakpoint, or a single value at all sizes; the Flex axis. */
export type ResponsiveColumnsGap = ResponsiveGap

/** The alignment of each cell in its row per breakpoint, or a single value at all sizes; the Flex axis. */
export type ResponsiveColumnsAlign = ResponsiveAlign
