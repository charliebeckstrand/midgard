/**
 * Core density scale — the foundation all components reference.
 *
 *   step   height   px    py    gap   icon    text
 *   ─────  ──────   ────  ────  ────  ──────  ──────────
 *   xs     24px     —     —     2px   12px    12px/16px
 *   sm     28px     6px   6px   4px   16px    12px/16px
 *   md     36px     8px   8px   4px   20px    14px/20px
 *   lg     44px     12px  10px  8px   20px    16px/24px
 *
 * xs has no px/py token because consumers (currently only button) need
 * a border-aware offset and define padding inline. text.xs aliases text.sm
 * because text-xs is the smallest standard size — xs differs from sm only
 * in padding, gap, and icon dimensions.
 */

export const px = { sm: 'px-1.5', md: 'px-2', lg: 'px-3' }
export const py = { sm: 'py-1.5', md: 'py-2', lg: 'py-2.5' }
export const gap = { xs: 'gap-0.5', sm: 'gap-0.75', md: 'gap-1', lg: 'gap-1.5' }
export const text = { xs: 'text-xs/4', sm: 'text-xs/4', md: 'text-sm/5', lg: 'text-base/6' }

/** Icon slot — applies sizing to data-slot="icon" children */
export const iconSlot = {
	xs: '*:data-[slot=icon]:size-3 *:data-[slot=icon]:shrink-0',
	sm: '*:data-[slot=icon]:size-4 *:data-[slot=icon]:shrink-0',
	md: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
	lg: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
}
