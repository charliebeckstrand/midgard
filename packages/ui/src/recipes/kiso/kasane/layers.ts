/**
 * Kasane (重ね): layered chrome.
 *
 * The library's signature 4-layer stack on a single element; inset
 * fill, hover ring, focus ring, and validation ring compose without
 * conflict. Spread `all` for the full effect, or pick individual layers
 * when a kata only wants a subset.
 *
 * Layer: kiso · Concern: layered chrome
 */

import { mode } from '../../../core/recipe'

/**
 * Base ring under the other layers. The ring uses solid colours (not
 * translucent like `sen.ring.inset`); adjacent rings in a group overlap
 * by 1 px without alpha-stacking into a darker line at the join. Radius
 * is not bundled; composers add `radius(v)` (or `r(v)` for the
 * outer-only case) per component density step.
 */
const base = ['ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700']

/** `::before` inset fill: paints the surface inside the 1 px outer ring. */
const inset = ['before:absolute before:inset-px']

/** `::after` overlay used by focus and validation rings. */
const overlay = [
	'after:absolute after:inset-0 after:ring-transparent after:ring-inset after:pointer-events-none',
]

/** Outer ring colour on hover: one shade darker / lighter than resting. */
const hover = mode(
	'not-has-[>:disabled]:hover:ring-zinc-400',
	'not-has-[>:disabled]:dark:hover:ring-zinc-600',
)

/** `::after` 2 px focus ring: blue when no validation state is active. */
const focus = [
	// Lifts the focused element above its attached-group siblings via z-index;
	// stacking context comes from `relative` in `control.frame`.
	'focus-within:z-10',
	'data-open:z-10',
	'focus-within:after:ring-2',
	'data-open:after:ring-2',
	'not-has-[[data-invalid]]:not-has-[[data-valid]]:not-has-[[data-warning]]:focus-within:after:ring-blue-600',
	'not-has-[[data-invalid]]:not-has-[[data-valid]]:not-has-[[data-warning]]:data-open:after:ring-blue-600',
]

// Per-state validation rings on the outer ring + `::after`. The three blocks
// share the same six-selector shape; the selectors stay literal since
// Tailwind's source scanner can't see template-constructed classes.
const valid = [
	'has-[[data-valid]]:ring-green-600',
	'has-[[data-valid]]:hover:ring-green-600',
	'has-[[data-valid]]:focus-within:after:ring-green-600',
	'has-[[data-valid]]:not-focus-within:after:ring-1',
	'has-[[data-valid]]:not-focus-within:after:ring-green-600',
	'has-[[data-valid]]:data-open:after:ring-green-600',
]

const warning = [
	'has-[[data-warning]]:ring-amber-500',
	'has-[[data-warning]]:hover:ring-amber-500',
	'has-[[data-warning]]:focus-within:after:ring-amber-500',
	'has-[[data-warning]]:not-focus-within:after:ring-1',
	'has-[[data-warning]]:not-focus-within:after:ring-amber-500',
	'has-[[data-warning]]:data-open:after:ring-amber-500',
]

const invalid = [
	'has-[[data-invalid]]:ring-red-600',
	'has-[[data-invalid]]:hover:ring-red-600',
	'has-[[data-invalid]]:focus-within:after:ring-red-600',
	'has-[[data-invalid]]:not-focus-within:after:ring-1',
	'has-[[data-invalid]]:not-focus-within:after:ring-red-600',
	'has-[[data-invalid]]:data-open:after:ring-red-600',
]

/** Validation ring on the outer ring + `::after`: red / amber / green per data-* attribute. */
const validation = [...valid, ...warning, ...invalid]

/** Disabled state: dims and locks pointer when the wrapped element is :disabled. */
const disabled = [
	'has-[>:disabled]:opacity-50',
	'has-[>:disabled]:before:shadow-none',
	'has-[>:disabled]:cursor-not-allowed',
	'has-[>:disabled]:**:cursor-not-allowed',
]

/** Every fragment in the correct spread order for a `className`. */
const all = [...base, ...inset, ...overlay, ...hover, ...focus, ...validation, ...disabled]

export const layers = {
	base,
	inset,
	overlay,
	hover,
	focus,
	validation,
	disabled,
	all,
} as const
