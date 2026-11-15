/**
 * Ugoki css: the Tailwind transition and animation fragments of the state
 * changes that do not need Motion.
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
	 * A box resizing between two fixed sizes: the drawer's `half` ↔ `full`, not a
	 * box growing to its content. `height` interpolates only between two lengths,
	 * so a panel sized by what it holds cannot travel on this at all. Framer
	 * Motion measures it the second length and moves it, on `spring.fit`. The
	 * corner rides along because a panel that squares its top on reaching the
	 * screen edge must square it on the way there.
	 */
	size: 'motion-safe:transition-[height,border-radius]',
	/**
	 * The corner alone, for a panel whose height something else already moves:
	 * one grown to its content, which only Framer Motion can travel between.
	 * `size` states the pair, and a CSS transition on `height` fights a per-frame
	 * write. Every frame the animation lands becomes a transition toward it, so
	 * the edge trails the value it was given.
	 */
	corner: 'motion-safe:transition-[border-radius]',
	duration: 'motion-safe:duration-150',
	/**
	 * The tempo of `collapse` in CSS: its duration and its curve (`easeInOut`
	 * of Framer Motion). A CSS reveal that opens a panel takes it, and so does
	 * the chevron of a panel that `collapse` opens. Thus the chevron turns in
	 * the time that the panel takes. `ugoki-css.test.ts` holds it to `collapse`.
	 */
	collapse: 'motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.42,0,0.58,1)]',
	pulse: 'motion-safe:animate-pulse',
} as const
