/**
 * Ki (気) — Energy.
 *
 * How an element signals focus.
 *
 * Tier: 1 · Concern: focus
 */

export const ki = {
	ring: 'outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
	inset: 'outline-none focus-visible:ring-2 ring-inset focus-visible:ring-blue-600',
	offset:
		'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600',
	outline:
		'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600',
	indicator: 'not-data-current:focus-visible:after:bg-blue-600',
	lifted: 'z-10 shadow-md focus-visible:ring-violet-600',
}
