/**
 * Kasane (重ね) — Layered.
 *
 * The library's signature chrome primitive: a four-layer stack that lives on
 * a single element and lets each visual concern (inset fill, hover ring,
 * focus ring, validation ring) be applied independently without conflict.
 *
 * Most libraries collapse these into a single ring + colour swap. The kasane
 * pattern uses `::before` for the inset fill and `::after` for the focus /
 * validation overlay, so the four states compose freely:
 *
 *   - The outer `ring` carries the resting border + hover colour.
 *   - The `::before` fills the 1 px inset so the surface paints inside the ring.
 *   - The `::after` provides the focus-visible / validation 2 px ring overlay.
 *   - The `::after` is again recoloured by `data-invalid` / `data-warning` /
 *     `data-valid` selectors that take precedence over the focus colour.
 *
 * Spread `kasane.all` into a single element's className for the full effect,
 * or compose individual layers when a kata only wants a subset (e.g. hover
 * + focus without validation).
 *
 * Layer: waku · Concern: layered chrome
 */

/**
 * Base ring + radius that the layers are applied on top of. The ring uses
 * solid colours (not translucent like `sen.ringInset`) so adjacent rings in
 * a group can overlap by 1 px without alpha-stacking into a darker line at
 * the join.
 */
const base = ['ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700', 'rounded-lg']

/** `::before` inset fill — paints the surface inside the 1 px outer ring. */
const inset = ['before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)]']

/** `::after` overlay used by focus and validation rings. */
const overlay = [
	'after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset after:pointer-events-none',
]

/** Outer ring colour on hover — one shade darker / lighter than resting. */
const hover = [
	'not-has-[>:disabled]:hover:ring-zinc-400',
	'not-has-[>:disabled]:dark:hover:ring-zinc-600',
]

/** `::after` 2 px focus ring — blue when no validation state is active. */
const focus = [
	'focus-within:after:ring-2',
	'data-open:after:ring-2',
	'not-has-[[data-invalid]]:not-has-[[data-valid]]:not-has-[[data-warning]]:focus-within:after:ring-blue-600',
	'not-has-[[data-invalid]]:not-has-[[data-valid]]:not-has-[[data-warning]]:data-open:after:ring-blue-600',
	// Lift the focused element above its attached-group siblings so the join
	// doesn't overpaint the joined-side focus ring with the neighbour's resting
	// ring. `relative` already in `control.frame` provides the stacking context.
	'focus-within:z-10',
	'data-open:z-10',
]

/** Validation ring on the outer ring + `::after` — red / amber / green per data-* attribute. */
const validation = [
	'has-[[data-invalid]]:focus-within:after:ring-red-600',
	'has-[[data-warning]]:focus-within:after:ring-amber-500',
	'has-[[data-valid]]:focus-within:after:ring-green-600',
	'has-[[data-invalid]]:data-open:after:ring-red-600',
	'has-[[data-warning]]:data-open:after:ring-amber-500',
	'has-[[data-invalid]]:ring-red-600',
	'has-[[data-invalid]]:not-focus-within:after:ring-1',
	'has-[[data-invalid]]:not-focus-within:after:ring-red-600',
	'has-[[data-invalid]]:hover:ring-red-600',
	'has-[[data-warning]]:ring-amber-500',
	'has-[[data-warning]]:not-focus-within:after:ring-1',
	'has-[[data-warning]]:not-focus-within:after:ring-amber-500',
	'has-[[data-warning]]:hover:ring-amber-500',
	'has-[[data-valid]]:ring-green-600',
	'has-[[data-valid]]:not-focus-within:after:ring-1',
	'has-[[data-valid]]:not-focus-within:after:ring-green-600',
	'has-[[data-valid]]:hover:ring-green-600',
	'has-[[data-valid]]:data-open:after:ring-green-600',
]

/** Disabled state — dims and locks pointer when the wrapped element is :disabled. */
const disabled = [
	'has-[>:disabled]:opacity-50',
	'has-[>:disabled]:before:shadow-none',
	'has-[>:disabled]:cursor-not-allowed',
	'has-[>:disabled]:**:cursor-not-allowed',
]

export const kasane = {
	base,
	inset,
	overlay,
	hover,
	focus,
	validation,
	disabled,
	/** Convenience: the full 7-layer stack, in the order they should be spread into className. */
	all: [...base, ...inset, ...overlay, ...hover, ...focus, ...validation, ...disabled],
} as const
