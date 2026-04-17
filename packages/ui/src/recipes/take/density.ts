/**
 * Core density scale referenced by all components.
 *
 *   step   height   gap   icon    text
 *   ─────  ──────   ────  ──────  ──────────
 *   xs     24px     2px   12px    12px/16px
 *   sm     28px     4px   16px    12px/16px
 *   md     36px     4px   20px    14px/20px
 *   lg     44px     8px   20px    16px/24px
 *
 * Density-aware padding lives in ma.density.px/py.
 * text.xs aliases text.sm; xs differs from sm only in padding, gap, and icon size.
 */

export const gap = { xs: 'gap-0.5', sm: 'gap-0.75', md: 'gap-1', lg: 'gap-1.5' }
export const text = { xs: 'text-[0.625rem]/3', sm: 'text-xs/4', md: 'text-sm/5', lg: 'text-base/6' }

/** Icon slot — sizes data-slot="icon" children per density step. */
export const iconSlot = {
	xs: '*:data-[slot=icon]:size-3 *:data-[slot=icon]:shrink-0',
	sm: '*:data-[slot=icon]:size-4 *:data-[slot=icon]:shrink-0',
	md: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
	lg: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
}
