import type { Hsva } from './types'

/** Opaque black; the fallback when no initial value is given. */
export const DEFAULT_HSVA: Hsva = { h: 0, s: 0, v: 0, a: 1 }

/**
 * Preset swatches rendered when the consumer doesn't supply their own. A
 * Tailwind-`500`-weight spread across the hue wheel plus the neutral ends.
 */
export const DEFAULT_SWATCHES: readonly string[] = [
	'#ef4444',
	'#f97316',
	'#f59e0b',
	'#eab308',
	'#84cc16',
	'#22c55e',
	'#10b981',
	'#14b8a6',
	'#06b6d4',
	'#3b82f6',
	'#6366f1',
	'#8b5cf6',
	'#a855f7',
	'#d946ef',
	'#ec4899',
	'#f43f5e',
	'#ffffff',
	'#a1a1aa',
	'#52525b',
	'#000000',
]
