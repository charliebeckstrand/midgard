/**
 * Ugoki base: the tempo primitives every Framer Motion token composes from —
 * the duration scale and the easing vocabulary. Every ugoki config, and every
 * module-level timing spec downstream (`chart-motion.ts`, `map-constants.ts`),
 * derives from these two maps, so the system's tempo is retuned here and
 * nowhere else.
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

/**
 * The easing vocabulary: Framer's three named curves plus `standard`, the CSS
 * `ease` cubic-bezier — a quick start into a long settle, used where content
 * arrives (the reveal crossfade).
 */
export const ease = {
	in: 'easeIn',
	out: 'easeOut',
	inOut: 'easeInOut',
	standard: [0.25, 0.1, 0.25, 1],
} as const
