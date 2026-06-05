/**
 * Ugoki css — Tailwind transition / animation fragments for state
 * changes that don't warrant Framer Motion.
 *
 * All fragments are `motion-safe:`-gated so they no-op under
 * `prefers-reduced-motion: reduce` (WCAG 2.3.3), matching how the
 * `<ReducedMotion>` primitive treats Framer Motion subtrees.
 *
 * Layer: kiso · Concern: CSS transitions
 */

export const css = {
	opacity: 'motion-safe:transition-opacity',
	transform: 'motion-safe:transition-transform',
	duration: 'motion-safe:duration-150',
	pulse: 'motion-safe:animate-pulse',
} as const
