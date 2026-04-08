import { gap, text } from './density'

/**
 * Compact density — shared by badge and chip (same form factor).
 * The md step intentionally diverges from the core density — tighter text size
 * (xs/5 vs sm/5), narrower gap (1.5 vs 1), and smaller icon (3.5 vs 5).
 */
export const compact = {
	sm: ['px-1.5 py-0.5', gap.sm, text.sm, '*:data-[slot=icon]:size-4'],
	md: ['px-2 py-0.5', 'gap-x-1.5', 'text-xs/5', '*:data-[slot=icon]:size-3.5'],
	lg: ['px-2.5 py-1', 'gap-x-1.5', text.md, '*:data-[slot=icon]:size-4'],
} as const
