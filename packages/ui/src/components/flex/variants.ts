import { kumi } from '../../recipes'

export const gapMap = kumi.gap
export const directionMap = kumi.direction
export const alignMap = kumi.align
export const justifyMap = kumi.justify
export const widthMap = kumi.width

export type FlexGap = keyof typeof kumi.gap
export type FlexDirection = keyof typeof kumi.direction
export type FlexAlign = keyof typeof kumi.align
export type FlexJustify = keyof typeof kumi.justify
export type FlexWidth = keyof typeof kumi.width
