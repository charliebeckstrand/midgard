import { defineKata, mode } from '../../core/recipe'
import { dan, hannou, ji, kasane, narabi, sen } from '../kiso'
import { validation } from '../kumi/check'

const { disabled } = hannou
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { border } = sen

// The pad keeps a white surface in both themes, so the ink and the placeholder
// take the light-theme shades. A `dark:` foreground would paint light on white.
// The canvas reads its own computed `color` as the default stroke color.
//
// The pad is paper: forced colors do not adjust it, as they do not adjust an
// image. Its dark ink on white keeps a high contrast in each palette, and the
// saved image keeps that ink. Under forced colors the ink took `CanvasText`,
// which is white in a dark palette, so the saved image held white strokes. The
// edge, the focus ring, and the invalid outline of the pad are on the page, so
// they take system colors, and the pad drops its colored validation ring. The clear button is a control on the paper, so its
// actions adjust again.
export const k = defineKata({
	base: [
		'relative isolate overflow-hidden h-40',
		'bg-white text-zinc-950',
		border.default,
		rounded.lg,
		// The canvas takes the focus, from the clear button or a Form, but it
		// fills the pad, which clips it. So the pad draws the `sen.focus.ring`
		// stroke while its canvas has the keyboard focus.
		'has-[canvas:focus-visible]:outline-2 has-[canvas:focus-visible]:outline-offset-2',
		...mode(
			'has-[canvas:focus-visible]:outline-blue-600',
			'dark:has-[canvas:focus-visible]:outline-blue-500',
		),
		// The canvas carries the `data-*` validation state, so the pad paints the ring.
		...validation,
		...disabled.base,
		'forced-color-adjust-none',
		'forced-colors:border-[CanvasText] forced-colors:outline-[CanvasText]',
		'forced-colors:has-[canvas:focus-visible]:outline-[Highlight]',
		// The pad does not adjust, so forced colors keep its ring shadow. Forced
		// colors make red, amber, and green one color, so the pad drops the ring,
		// and only the invalid state keeps its outline (`sen.forced.invalid`).
		'forced-colors:has-[[data-invalid],[data-warning],[data-valid]]:ring-0',
	],
	slots: {
		canvas: ['block w-full h-full', 'cursor-crosshair touch-none select-none'],
		placeholder: [
			'absolute inset-0',
			flex.row,
			'justify-center',
			size.sm,
			'text-zinc-500',
			'pointer-events-none',
		],
		actions: ['absolute end-2 bottom-2', flex.row, dan.gap.scale.xs, 'forced-color-adjust-auto'],
	},
})
