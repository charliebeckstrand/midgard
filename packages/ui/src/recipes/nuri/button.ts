import { extend, outline, soft, solid, text } from './palette'

export const buttonSolid = { ...solid, ...extend.solid }

export const buttonSoft = { ...soft, ...extend.soft }

export const buttonOutline = outline

/** Shared by both `plain` and `ghost` button variants (text color only). */
export const buttonPlain = text
