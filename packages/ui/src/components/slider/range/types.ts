import type { RefObject } from 'react'

export type ThumbIndex = 0 | 1

export type OverlapMode = 'clamp' | 'swap'

export type ThumbButtonRefs = [
	RefObject<HTMLButtonElement | null>,
	RefObject<HTMLButtonElement | null>,
]
