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
import { forced } from '../sen/forced'
import { ring } from '../sen/ring'

/**
 * Base ring under the other layers. The ring uses solid colors, not
 * translucent like `sen.ring.inset`. Adjacent rings in a group overlap
 * by 1 px without alpha-stacking into a darker line at the join. Radius
 * is not bundled; each composer adds its own radius, as a stepped
 * `density-rounded-*` class when it follows density.
 *
 * The ring is zinc-500 in each mode. A light field has the fill of the page,
 * so the ring is the only mark of the control, and it must clear 3:1 against
 * the page (WCAG 1.4.11). Zinc-500 gives 4.8:1 on white and 3.7:1 on
 * zinc-900. `control-contrast.test.ts` guards it.
 */
const base = [...ring.line[1].inset, ...mode('ring-zinc-500', 'dark:ring-zinc-500')]

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
 * Outer ring color on hover: one shade further from the page than resting. It skips a
 * control that takes no edit and a validation state, like `focus`. A control
 * takes no edit when it is disabled (a `:disabled` field, or `data-disabled` on
 * a frame whose field is not a native control) or read-only (the marks of
 * `hannou.cursor`). The dark class comes later in the CSS, so it would
 * otherwise replace the validation ring on hover in dark mode. One
 * `not-has-[…]` holds the selector list.
 */
const hover = mode(
	'not-data-disabled:not-has-[>:disabled,[aria-readonly=true],[data-readonly],[readonly],[data-invalid],[data-valid],[data-warning]]:hover:ring-zinc-600',
	'not-data-disabled:not-has-[>:disabled,[aria-readonly=true],[data-readonly],[readonly],[data-invalid],[data-valid],[data-warning]]:dark:hover:ring-zinc-400',
)

/** `::after` 2 px focus ring: blue when no validation state is active. */
const focus = [
	// Lifts the focused element above its attached-group siblings via z-index;
	// stacking context comes from `relative` in `control.frame`.
	'focus-within:z-10',
	'data-open:z-10',
	'focus-within:after:ring-2',
	'data-open:after:ring-2',
	// Forced colors remove the ring, which is a box-shadow. This inset outline
	// marks the focused or open control there, in `Highlight`.
	'forced-colors:focus-within:after:outline-solid forced-colors:focus-within:after:outline-2',
	'forced-colors:focus-within:after:-outline-offset-2 forced-colors:focus-within:after:outline-[Highlight]',
	'forced-colors:data-open:after:outline-solid forced-colors:data-open:after:outline-2',
	'forced-colors:data-open:after:-outline-offset-2 forced-colors:data-open:after:outline-[Highlight]',
	...mode(
		'not-has-[[data-invalid],[data-valid],[data-warning]]:focus-within:after:ring-blue-600',
		'dark:not-has-[[data-invalid],[data-valid],[data-warning]]:focus-within:after:ring-blue-500',
	),
	...mode(
		'not-has-[[data-invalid],[data-valid],[data-warning]]:data-open:after:ring-blue-600',
		'dark:not-has-[[data-invalid],[data-valid],[data-warning]]:data-open:after:ring-blue-500',
	),
]

/**
 * Validation ring on the outer ring + `::after`: red / amber / green per data-*
 * attribute, each in the shade of its series slot (`zu.palette.series`). Each
 * state sets each property once. The hover class skips a validation state, so
 * the outer ring keeps its color on hover. The `::after`
 * ring has one color in each interaction state. Its width is 1 px at rest for
 * each state, and the focus and open classes make it 2 px. The selectors stay
 * literal, because Tailwind's source scanner can't see template-constructed
 * classes.
 *
 * Forced colors remove the rings, so an invalid control takes the outline of
 * `forced.invalid` there. The focus and the open classes paint it in
 * `Highlight`.
 */
const validation = [
	'has-[[data-invalid],[data-valid],[data-warning]]:not-focus-within:after:ring-1',
	'has-[[data-valid]]:ring-green-600 has-[[data-valid]]:after:ring-green-600',
	'has-[[data-warning]]:ring-amber-600 has-[[data-warning]]:after:ring-amber-600',
	...mode(
		'has-[[data-invalid]]:ring-red-600 has-[[data-invalid]]:after:ring-red-600',
		'dark:has-[[data-invalid]]:ring-red-500 dark:has-[[data-invalid]]:after:ring-red-500',
	),
	...forced.invalid.overlay,
]

/** Disabled state: dims and locks pointer when the wrapped element is :disabled. */
const disabled = [
	'has-[>:disabled]:opacity-50',
	'has-[>:disabled]:before:shadow-none',
	'has-[>:disabled]:cursor-not-allowed',
	'has-[>:disabled]:**:cursor-not-allowed',
]

/**
 * The fill of a soft control: a translucent wash in place of the base ring.
 * The wash reads on any surface, a glass panel included, because it tints what
 * is behind it. It is no heavier than the fill of a default control: 5% zinc on
 * light, and 5% white on dark, which is the dark fill of `surface.default`.
 * Hover doubles it: 10% zinc on light, 10% white on dark. A soft control thus
 * has the weight of a default control without its ring. Hover skips a control
 * that takes no edit, like `hover`.
 *
 * Forced colors replace the wash with the page color, so the wash takes the
 * outline of `sen.forced` at the place of the 1 px inset ring that it replaces
 * (CONVENTIONS §5.10).
 */
const wash = [
	...mode('bg-zinc-950/5', 'dark:bg-white/5'),
	forced.outline,
	'forced-colors:-outline-offset-1',
	...mode(
		'not-data-disabled:not-has-[>:disabled,[aria-readonly=true],[data-readonly],[readonly]]:hover:bg-zinc-950/10',
		'not-data-disabled:not-has-[>:disabled,[aria-readonly=true],[data-readonly],[readonly]]:dark:hover:bg-white/10',
	),
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

/**
 * The stack of a soft control: the wash in place of the base ring, the inset
 * fill, and the hover ring. The focus, validation, and disabled states stay.
 */
export const softLayers = [...overlay, ...wash, ...focus, ...validation, ...disabled]
