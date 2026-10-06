import type { Ma } from '../../recipes'
import { k } from '../../recipes/kata/box'
import { atBreakpoint, type Responsive, resolveResponsive } from '../../types'

/** Spacing-scale step for {@link Box} padding props. */
export type BoxPadding = Ma

/** {@link BoxPadding} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveBoxPadding = Responsive<BoxPadding>

/** Background surface token for {@link Box}. */
export type BoxBg = keyof typeof k.bg

/**
 * Outline weight for {@link Box}: `true` for the default weight, or `'subtle'`
 * or `'strong'` for a different weight.
 */
export type BoxOutline = boolean | keyof typeof k.outline.weight

/** Border-radius token for {@link Box}. */
export type BoxRadius = keyof typeof k.radius

/** The all-sides padding classes for a responsive `p`. @internal */
export function resolvePadding(value: ResponsiveBoxPadding | undefined): string[] {
	return resolveResponsive(value, (v, bp) => atBreakpoint(k.padding[v], bp))
}

/** The horizontal padding classes for a responsive `px`. @internal */
export function resolvePx(value: ResponsiveBoxPadding | undefined): string[] {
	return resolveResponsive(value, (v, bp) => atBreakpoint(k.px[v], bp))
}

/** The vertical padding classes for a responsive `py`. @internal */
export function resolvePy(value: ResponsiveBoxPadding | undefined): string[] {
	return resolveResponsive(value, (v, bp) => atBreakpoint(k.py[v], bp))
}
