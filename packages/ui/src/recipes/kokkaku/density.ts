/**
 * Skeleton heights mirroring the density grid (take/density.ts).
 *
 *   step   height
 *   ─────  ──────
 *   xs     24px    h-6
 *   sm     28px    h-7
 *   md     36px    h-9
 *   lg     44px    h-11
 */
export const control = {
	xs: 'h-6',
	sm: 'h-7',
	md: 'h-9',
	lg: 'h-11',
} as const

/**
 * Compact skeleton heights — badge, chip, and switch.
 *
 *   step   height
 *   ─────  ──────
 *   sm     20px    h-5
 *   md     24px    h-6
 *   lg     28px    h-7
 */
export const compact = {
	xs: 'h-4',
	sm: 'h-5',
	md: 'h-6',
	lg: 'h-7',
} as const
