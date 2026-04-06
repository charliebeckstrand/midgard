import { extend, outline, soft, solid, text } from './palette'

export const buttonSolid = { ...solid, ...extend.solid }

export const buttonSoft = { ...soft, ...extend.soft }

export const buttonOutline = outline

export const buttonPlain = text

export const buttonGhost = text
