import { gap, text } from './density'

/**
 * Compact density — shared by badge and chip.
 *
 * The md step intentionally diverges from core density: tighter text,
 * narrower gap, and smaller icon.
 */
export const compact = {
	xs: ['px-1 py-0.5', gap.xs, text.xs, '*:data-[slot=icon]:size-3'],
	sm: ['px-1.5 py-0.5', gap.sm, text.sm, '*:data-[slot=icon]:size-4'],
	md: ['px-2 py-0.5', gap.md, text.md, '*:data-[slot=icon]:size-3.5'],
	lg: ['px-2.5 py-1', gap.lg, text.lg, '*:data-[slot=icon]:size-4'],
} as const
