/**
 * The check group: the shared structure of `<Checkbox>` and `<Radio>`. The
 * `base` slot is the visible box or circle, with the standard hover and
 * disabled treatment. The `input` slot is the native input over it, so the
 * keyboard, the focus, and the form semantics stay on the native element.
 * The `color` axis sets the accent of a checked control, and each unit adds
 * its own `zinc`.
 *
 * Switch, Rating, SignaturePad, and Tree read the `hidden`, `validation`, and
 * `rest` fragments.
 */

import { defineGroup, mode } from '../../../core/recipe'
import { hannou, narabi, sen } from '../../kiso'

const { cursor } = hannou
const { flex } = narabi
const { focus, forced } = sen

/** Visually hidden native input overlaying the custom check surface. */
export const hidden = ['absolute inset-0', 'opacity-0', ...cursor, forced.control]

/**
 * Validation ring keyed off the overlaid input's `data-*` state: red / amber /
 * green, mirroring the framed-control kasane layers. The native input sits
 * inside the surface, so the box / circle / track `has` the attribute. Literal
 * class strings; Tailwind's scanner extracts them statically.
 *
 * Forced colors remove the ring, so an invalid control takes the outline of
 * `forced.invalid` there.
 */
export const validation = [
	'has-[[data-invalid],[data-warning],[data-valid]]:ring-2',
	'has-[[data-invalid]]:ring-red-600',
	'has-[[data-warning]]:ring-amber-500',
	'has-[[data-valid]]:ring-green-600',
	forced.invalid.within,
]

/**
 * The resting box: the fill and the border of an unchecked control. The border
 * is the only mark of an unchecked control, so it keeps a 3:1 contrast against
 * the page in each mode (WCAG 1.4.11). The check box of a Tree row takes it too.
 */
export const rest = mode(
	['bg-white', 'border border-zinc-950/50'],
	['dark:bg-white/5', 'dark:border-white/35'],
)

/**
 * Custom check surface (the visible box / circle): the resting box and its
 * hover border.
 *
 * The neutral hover border skips a checked control and an indeterminate
 * checkbox. It has a higher specificity than the checked border of the kata, so
 * it would otherwise replace the accent border on hover. The kata gives a
 * checked control its own hover. The indeterminate guard reads
 * `data-indeterminate`, as the kata does. Only a client effect sets the DOM
 * property, so the server HTML has only the attribute. A radio has no such
 * attribute, though it matches `:indeterminate` when no radio of its group is
 * checked.
 */
const surface = [
	...rest,
	...mode(
		'not-has-[:disabled,:checked,[data-indeterminate]]:hover:border-zinc-950/70 not-has-[:disabled,:checked,[data-indeterminate]]:group-has-[[data-slot=label]:hover]/field:border-zinc-950/70',
		'dark:not-has-[:disabled,:checked,[data-indeterminate]]:hover:border-white/50 dark:not-has-[:disabled,:checked,[data-indeterminate]]:group-has-[[data-slot=label]:hover]/field:border-white/50',
	),
	'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
	...validation,
]

/**
 * Layout shell: position, inline-flex centering, focus outline, cursor, and
 * touch action. `touch-manipulation` stops the iOS double-tap wait on a
 * Checkbox or a Radio without a field, as on Button. The toggle field sets it
 * on the whole row.
 */
const shell = [
	'relative',
	flex.inline,
	'justify-center',
	focus.outline,
	...cursor,
	'touch-manipulation',
]

/**
 * Checked-state accent colors shared by the checkbox and radio kata: each
 * injects the foreground mark, fill, and border into `--check-mark` /
 * `--check-bg` / `--check-border` for one accent. The zinc accent diverges per
 * component (checkbox uses a neutral fill, radio a high-contrast one). Each kata
 * adds its own zinc. Literal class strings; Tailwind's scanner extracts them
 * statically.
 */
const color = {
	red: '[--check-mark:var(--color-white)] [--check-bg:var(--color-red-600)] [--check-border:var(--color-red-800)]/90',
	amber:
		'[--check-mark:var(--color-amber-100)] [--check-bg:var(--color-amber-700)] [--check-border:var(--color-amber-600)]/80',
	green:
		'[--check-mark:var(--color-white)] [--check-bg:var(--color-green-600)] [--check-border:var(--color-green-800)]/90',
	blue: '[--check-mark:var(--color-white)] [--check-bg:var(--color-blue-600)] [--check-border:var(--color-blue-800)]/90',
} as const

export const check = defineGroup({
	slots: {
		/** The layout shell and the surface of the box or the circle. */
		base: { base: [...shell, ...surface], color },
		/** Visually-hidden native `<input>` overlaying the custom check surface. */
		input: { base: hidden },
	},
	defaults: { color: 'zinc' },
})
