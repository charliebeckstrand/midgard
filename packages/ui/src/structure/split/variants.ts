import type { SplitRatio } from '../../recipes/kata/split'
import type { Orientation } from '../../types/orientation'
import type { Responsive } from '../../utilities/responsive'
import type { ResponsiveAlign, ResponsiveGap } from '../flex/variants'

export type { SplitRatio }

/** Whether the panes lay out as columns (`horizontal`) or rows (`vertical`). */
export type SplitOrientation = Orientation

/** {@link SplitOrientation} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveSplitOrientation = Responsive<SplitOrientation>
/** {@link SplitRatio} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveSplitRatio = Responsive<SplitRatio>

/** The `align` values of Flex per breakpoint, or a single value applied at all sizes; the Flex axis. */
export type ResponsiveSplitAlign = ResponsiveAlign
/** The `Ma` gap step between the two panes per breakpoint, or a single value applied at all sizes; the Flex axis. */
export type ResponsiveSplitGap = ResponsiveGap
