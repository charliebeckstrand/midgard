import type { Ma } from '../../recipes'
import type { FlexAlign, FlexDirection, FlexJustify } from '../../recipes/kata/flex'
import type { Responsive } from '../../types'

export type { FlexAlign, FlexDirection, FlexJustify }

/** Spacing scale for the gap between flex children; a `Ma` step, `0` included. */
export type FlexGap = Ma

/** {@link FlexDirection} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveDirection = Responsive<FlexDirection>
/** {@link FlexAlign} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveAlign = Responsive<FlexAlign>
/** {@link FlexGap} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveGap = Responsive<FlexGap>
/** {@link FlexJustify} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveJustify = Responsive<FlexJustify>
