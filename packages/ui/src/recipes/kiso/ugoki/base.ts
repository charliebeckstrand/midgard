/**
 * Ugoki base: the tempo primitives every Framer Motion token composes from —
 * a constrained, named palette of durations and the easing vocabulary. Call
 * sites pick a step from the scale instead of minting a literal, so every
 * duration and easing in the system is enumerable here; per-item stagger
 * steps live in their timing specs.
 *
 * Layer: kiso · Concern: tempo primitives
 */

/**
 * The duration scale, in seconds as Framer Motion expects. Keys are
 * milliseconds, matching the Tailwind `duration-*` steps the CSS fragments in
 * `css.ts` use, so the two transition systems name a tempo the same way.
 */
export const duration = {
	100: 0.1,
	150: 0.15,
	200: 0.2,
	250: 0.25,
	300: 0.3,
	400: 0.4,
	500: 0.5,
	700: 0.7,
	800: 0.8,
} as const

/** The easing vocabulary: Framer's three named curves. */
export const ease = {
	in: 'easeIn',
	out: 'easeOut',
	inOut: 'easeInOut',
} as const
