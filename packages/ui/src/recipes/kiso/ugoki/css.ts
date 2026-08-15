/**
 * Ugoki css: Tailwind transition / animation fragments for state
 * changes that don't warrant Framer Motion.
 *
 * All fragments are `motion-safe:`-gated, honoring `prefers-reduced-motion:
 * reduce` (WCAG 2.3.3).
 *
 * Layer: kiso · Concern: CSS transitions
 */

export const css = {
	opacity: 'motion-safe:transition-opacity',
	transform: 'motion-safe:transition-transform',
	/**
	 * A box resizing between two fixed sizes — the drawer's `half` ↔ `full`, not a
	 * box growing to its content. `height` interpolates only between two lengths,
	 * so a panel sized by what it holds keeps snapping whatever this says; the
	 * corner rides along because a panel that squares its top on reaching the
	 * screen edge should square it on the way there.
	 */
	size: 'motion-safe:transition-[height,border-radius]',
	duration: 'motion-safe:duration-150',
	pulse: 'motion-safe:animate-pulse',
} as const
