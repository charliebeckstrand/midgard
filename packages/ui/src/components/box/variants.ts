import type { Ma } from '../../recipes'
import { k } from '../../recipes/kata/box'

/** Spacing-scale step for {@link Box} padding props. */
export type BoxPadding = Ma
/** Spacing-scale step for {@link Box} margin props; adds `'auto'` for centering. */
export type BoxMargin = Ma | 'auto'

export const paddingMap = k.padding
export const pxMap = k.px
export const pyMap = k.py
export const marginMap = k.margin
export const mxMap = k.mx
export const myMap = k.my
export const radiusMap = k.radius

/** Background surface token for {@link Box}. */
export type BoxBg = keyof typeof k.bg
/** Outline weight for {@link Box}; `true` selects the default token. */
export type BoxOutline = boolean | keyof typeof k.outline
/** Border-radius token for {@link Box}. */
export type BoxRadius = keyof typeof radiusMap
