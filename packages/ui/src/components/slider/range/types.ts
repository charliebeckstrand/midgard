import type { RefObject } from 'react'

/** Which thumb of a range slider a value or gesture belongs to: `0` is the start thumb, `1` the end. */
export type ThumbIndex = 0 | 1

export type OverlapMode = 'clamp' | 'swap'

export type ThumbButtonRefs = [
	RefObject<HTMLButtonElement | null>,
	RefObject<HTMLButtonElement | null>,
]
