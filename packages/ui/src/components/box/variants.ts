import type { Ma } from '../../recipes'
import { k } from '../../recipes/kata/box'

export type BoxPadding = Ma
export type BoxMargin = Ma | 'auto'

export const paddingMap = k.padding
export const pxMap = k.px
export const pyMap = k.py
export const marginMap = k.margin
export const mxMap = k.mx
export const myMap = k.my
export const radiusMap = k.radius

export type BoxBg = keyof typeof k.bg
export type BoxOutline = boolean | keyof typeof k.outline
export type BoxRadius = keyof typeof radiusMap
