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
	 * so a panel sized by what it holds cannot travel on this at all — Framer
	 * Motion measures it the second length and moves it, on `spring.fit`. The
	 * corner rides along because a panel that squares its top on reaching the
	 * screen edge should square it on the way there.
	 */
	size: 'motion-safe:transition-[height,border-radius]',
	/**
	 * The corner alone, for a panel whose height something else already moves —
	 * one grown to its content, which only Framer Motion can travel between.
	 * `size` states the pair, and a CSS transition on `height` fights a per-frame
	 * write: every frame the animation lands becomes a transition toward it, so
	 * the edge trails the value it was given.
	 */
	corner: 'motion-safe:transition-[border-radius]',
	duration: 'motion-safe:duration-150',
	pulse: 'motion-safe:animate-pulse',
} as const
