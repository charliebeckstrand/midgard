import type { Ma } from '../../recipes'
import type { k } from '../../recipes/kata/box'

/** Spacing-scale step for {@link Box} padding props. */
export type BoxPadding = Ma

/** Spacing-scale step for {@link Box} margin props; adds `'auto'` for centering. */
export type BoxMargin = Ma | 'auto'

/** Background surface token for {@link Box}. */
export type BoxBg = keyof typeof k.bg

/** Outline weight for {@link Box}; `true` selects the default token. */
export type BoxOutline = boolean | keyof typeof k.outline

/** Border-radius token for {@link Box}. */
export type BoxRadius = keyof typeof k.radius
