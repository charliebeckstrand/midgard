import type { Ma } from '../../recipes'
import type { BoxBg, BoxRadius } from '../../recipes/kata/box'
import type { Responsive } from '../../types'

export type { BoxBg, BoxRadius }

/** Spacing-scale step for {@link Box} padding props. */
export type BoxPadding = Ma

/** {@link BoxPadding} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveBoxPadding = Responsive<BoxPadding>

/**
 * Outline weight for {@link Box}: `true` for the default weight, or `'subtle'`
 * or `'strong'` for a different weight.
 */
export type BoxOutline = boolean | 'subtle' | 'strong'
