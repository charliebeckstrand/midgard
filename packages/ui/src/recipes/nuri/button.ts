import { merge, outline, plainHover, soft, softHover, solid, solidHover, text } from './palette'

const inherit = ['text-inherit', 'not-disabled:hover:bg-current/15'] as string[]

export const buttonSolid = { ...merge(solid, solidHover), inherit }

export const buttonSoft = { ...merge(soft, softHover), inherit }

export const buttonOutline = { ...merge(outline, plainHover), inherit }

export const buttonPlain = { ...merge(text, plainHover), inherit }

export const buttonGhost = { ...text, inherit: ['text-inherit'] as string[] }
