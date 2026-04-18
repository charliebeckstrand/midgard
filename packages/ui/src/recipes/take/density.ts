/**
 * Core density scale referenced by all components.
 *
 *   step   height   gap   icon    text
 *   ─────  ──────   ────  ──────  ──────────
 *   xs     24px     2px   12px    12px/16px
 *   sm     28px     4px   16px    12px/16px
 *   md     36px     4px   20px    14px/20px
 *   lg     44px     8px   24px    16px/24px
 *
 * Density-aware padding lives in ma.density.px/py.
 * text.xs aliases text.sm; xs differs from sm only in padding, gap, and icon size.
 */

export const gap = { xs: 'gap-0.5', sm: 'gap-1', md: 'gap-2', lg: 'gap-3', base: 'gap-4' }

export const text = {
	xs: 'text-xs/4',
	sm: 'text-sm/5',
	md: 'text-base/6',
	lg: 'text-lg/7',
	xl: 'text-xl/8',
	'2xl': 'text-2xl/9',
	'3xl': 'text-3xl/10',
	'4xl': 'text-4xl/11',
}

/** Icon slot — sizes data-slot="icon" children per density step. */
export const icon = {
	xs: '*:data-[slot=icon]:size-3 *:data-[slot=icon]:shrink-0',
	sm: '*:data-[slot=icon]:size-4 *:data-[slot=icon]:shrink-0',
	md: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
	lg: '*:data-[slot=icon]:size-6 *:data-[slot=icon]:shrink-0',
}
