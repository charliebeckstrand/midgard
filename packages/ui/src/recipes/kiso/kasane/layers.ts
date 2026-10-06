/**
 * Kasane (重ね): layered chrome.
 *
 * The library's signature 4-layer stack on a single element; inset
 * fill, hover ring, focus ring, and validation ring compose without
 * conflict. `layers` is the whole stack. The parts stay in this module,
 * because the control frame is the one reader, and it spreads all of them.
 *
 * Layer: kiso · Concern: layered chrome
 */

import { mode } from '../../../core/recipe'

/**
 * Base ring under the other layers. The ring uses solid colors, not
 * translucent like `sen.ring.inset`. Adjacent rings in a group overlap
 * by 1 px without alpha-stacking into a darker line at the join. Radius
 * is not bundled; each composer adds its own radius, as a stepped
 * `density-rounded-*` class when it follows density.
 */
const base = ['ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700']

/**
 * `::before` inset fill: paints the surface inside the 1 px outer ring.
 * `pointer-events-none` keeps the decorative fill from stealing pointer events
 * from non-positioned affix slots beneath it. The `::before` belongs to the
 * frame. Without this a click on a chevron/icon affix targets the frame, and
 * the affix's own cursor and handlers never fire. It mirrors `overlay`'s `::after`.
 * Surfaces toggle this layer per mode (`dark:before:hidden`), so the leak shows
 * in light mode only.
 */
const inset = ['before:absolute before:inset-px before:pointer-events-none']

/** `::after` overlay used by focus and validation rings. */
const overlay = [
	'after:absolute after:inset-0 after:ring-transparent after:ring-inset after:pointer-events-none',
]

/**
 * Outer ring color on hover: one shade darker / lighter than resting. It skips a
 * disabled control and a validation state, like `focus`. The dark class comes
 * later in the CSS, so it would otherwise replace the validation ring on hover
 * in dark mode. One `not-has-[…]` holds the selector list.
 */
const hover = mode(
	'not-has-[>:disabled,[data-invalid],[data-valid],[data-warning]]:hover:ring-zinc-400',
	'not-has-[>:disabled,[data-invalid],[data-valid],[data-warning]]:dark:hover:ring-zinc-600',
)

/** `::after` 2 px focus ring: blue when no validation state is active. */
const focus = [
	// Lifts the focused element above its attached-group siblings via z-index;
	// stacking context comes from `relative` in `control.frame`.
	'focus-within:z-10',
	'data-open:z-10',
	'focus-within:after:ring-2',
	'data-open:after:ring-2',
	'not-has-[[data-invalid],[data-valid],[data-warning]]:focus-within:after:ring-blue-600',
	'not-has-[[data-invalid],[data-valid],[data-warning]]:data-open:after:ring-blue-600',
]

/**
 * Validation ring on the outer ring + `::after`: red / amber / green per data-*
 * attribute. Each state sets each property once. The hover class skips a
 * validation state, so the outer ring keeps its color on hover. The `::after`
 * ring has one color in each interaction state. Its width is 1 px at rest for
 * each state, and the focus and open classes make it 2 px. The selectors stay
 * literal, because Tailwind's source scanner can't see template-constructed
 * classes.
 */
const validation = [
	'has-[[data-invalid],[data-valid],[data-warning]]:not-focus-within:after:ring-1',
	'has-[[data-valid]]:ring-green-600 has-[[data-valid]]:after:ring-green-600',
	'has-[[data-warning]]:ring-amber-500 has-[[data-warning]]:after:ring-amber-500',
	'has-[[data-invalid]]:ring-red-600 has-[[data-invalid]]:after:ring-red-600',
]

/** Disabled state: dims and locks pointer when the wrapped element is :disabled. */
const disabled = [
	'has-[>:disabled]:opacity-50',
	'has-[>:disabled]:before:shadow-none',
	'has-[>:disabled]:cursor-not-allowed',
	'has-[>:disabled]:**:cursor-not-allowed',
]

/** The whole stack: each part in the correct spread order for a `className`. */
export const layers = [
	...base,
	...inset,
	...overlay,
	...hover,
	...focus,
	...validation,
	...disabled,
]
