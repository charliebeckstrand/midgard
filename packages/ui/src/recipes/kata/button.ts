import type { ControlStep } from '../../core/density'
import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kokkaku, narabi, sen, shaku } from '../kiso'
import { dan } from '../kiso/dan'

const { extendedPalette } = iro
const { cursor, disabled } = hannou
const { weight } = ji
const { button } = kokkaku
const { flex } = narabi
const { focus } = sen
const { iconSlotRamp } = shaku

export const k = defineRecipe({
	base: [
		'relative isolate',
		'touch-manipulation',
		// A long press on iOS selects the label text. iOS Safari can select the
		// text in a child span of a `select-none` button, so the children also
		// set it. HoldButton, which the user presses and holds, shows this most.
		'select-none *:select-none',
		flex.inline,
		'justify-center',
		'w-fit shrink-0',
		weight.semibold,
		...disabled,
		...cursor,
		// Each step is in a stepped `density-*` class: the button takes the step of
		// its nearest density scope, and an explicit `size` makes the button its own
		// scope. Five values give the steps from `xs` to `xl`, and `xl` takes the
		// `lg` values. A button has no `xl` size (`ControlStep`), so the `xl`
		// value is only for a button in an `xl` scope. Square padding (`p`) keeps
		// an icon-only button even-sided.
		// When a text label is present the component sets `data-has-label`, which
		// overrides `py` with the matching control step. A labeled button thus
		// aligns with the Input and Select chrome of the same size (md → 38px).
		dan.text.chip,
		...iconSlotRamp,
		dan.gap.button,
		dan.space.button,
		dan.radius.button,
		dan.space.buttonLabelY,
		// A LoadingSpinner, LoadingDots, or Kbd child sizes itself in a button: its
		// own recipe selects a parent with `data-variant`, which Button always
		// writes. See `kata/loading.ts` and `kata/kbd.ts`.
	],
	variant: {
		solid: focus.ring,
		soft: focus.inset,
		outline: ['ring-1 ring-inset', focus.inset],
		plain: focus.inset,
		// Icon-only floor: a square pad per step keeps an icon-only bare button
		// even-sided. `not-data-[has-label]` yields to the base padding once a
		// label is present.
		bare: [focus.inset, dan.space.buttonBare],
	},
	// Opt into the wide palette: Button's `color` axis carries the standard set
	// plus the extended hues (rose / violet / sky), matching Badge.
	palette: definePalette(
		{
			solid: [extendedPalette.solid.bg, extendedPalette.solid.text, extendedPalette.solid.hover],
			soft: [extendedPalette.soft.bg, extendedPalette.soft.text, extendedPalette.soft.hover],
			outline: [
				extendedPalette.outline.ring,
				extendedPalette.outline.text,
				extendedPalette.outline.hover,
			],
			plain: [extendedPalette.plain.text, extendedPalette.plain.hover],
			bare: [extendedPalette.bare.text, extendedPalette.bare.hover],
		},
		// Synthetic color entry: inherits parent text color with a hover wash on non-disabled elements.
		{ inherit: ['text-inherit', 'not-disabled:not-data-disabled:hover:bg-current/15'] },
	),
	defaults: { variant: 'solid', color: 'zinc' },
	skeleton: button,
})

/** Recipe variant props for {@link Button} — the styling axes its kata exposes (`variant`, `color`) and the `size` step, for consumers composing custom slots. */
export type ButtonVariants = VariantProps<typeof k> & {
	/** The density step. Omit it to take the step of the nearest density scope. */
	size?: ControlStep
}
