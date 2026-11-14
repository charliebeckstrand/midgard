import type { ColumnCount } from '../../recipes/kata/columns'
import type { Responsive } from '../../utilities/responsive'
import type { ResponsiveAlign, ResponsiveGap } from '../flex/variants'

export type { ColumnCount }

/** {@link ColumnCount} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveColumnCount = Responsive<ColumnCount>

/** The `Ma` gap step between the cells per breakpoint, or a single value at all sizes; the Flex axis. */
export type ResponsiveColumnsGap = ResponsiveGap

/** The alignment of each cell in its row per breakpoint, or a single value at all sizes; the Flex axis. */
export type ResponsiveColumnsAlign = ResponsiveAlign
