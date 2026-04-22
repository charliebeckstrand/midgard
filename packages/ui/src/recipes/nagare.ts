/**
 * Nagare (流れ) — Flow.
 *
 * Tailwind transitions — how a property moves from one value to the next.
 * Complements ugoki (Framer Motion choreography) for pure CSS state changes.
 *
 * Tier: 1 · Concern: transition
 */

export const nagare = {
	opacity: 'transition-opacity',
	transform: 'transition-transform',
	duration: 'duration-150',
} as const
