import { kumi } from '../../recipes'

export const gapMap = kumi.gap
export const directionMap = kumi.direction
export const alignMap = kumi.align
export const justifyMap = kumi.justify
export const widthMap = kumi.width

export type StackGap = keyof typeof kumi.gap
export type StackDirection = keyof typeof kumi.direction
export type StackAlign = keyof typeof kumi.align
export type StackJustify = keyof typeof kumi.justify
export type StackWidth = keyof typeof kumi.width
