import { extend, outline, soft, solid, text } from './palette'

const inherit = ['text-inherit'] as string[]

export const buttonSolid = { ...solid, ...extend.solid, inherit }

export const buttonSoft = { ...soft, ...extend.soft, inherit }

export const buttonOutline = { ...outline, inherit }

/** Shared by both `plain` and `ghost` button variants (text color only). */
export const buttonPlain = { ...text, inherit }
