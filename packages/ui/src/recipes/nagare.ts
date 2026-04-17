/**
 * Nagare (流れ) — Flow.
 *
 * Tailwind transitions — how a property moves from one value to the next.
 * Complements ugoki (Framer Motion choreography) for pure CSS state changes.
 *
 * Tier: 1 · Concern: transition
 */

export const nagare = {
	opacity: 'transition-opacity duration-150',
	transform: 'transition-transform duration-200',
} as const
