import { defineScale, type ScaleStep } from '../../core/density'
import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kokkaku, narabi, sen, shaku } from '../kiso'
import { dan } from '../kiso/dan'

const { extended } = iro
const { cursor, disabled } = hannou
const { weight } = ji
const { button } = kokkaku
const { flex } = narabi
const { focus } = sen

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
		// scope. Five values give the steps from `xs` to `xl`, so the size scale is
		// `xs` to `xl` (`scale`). Square padding (`p`) keeps an icon-only button
		// even-sided, and it is 2 px more than `py`, so the square is as tall as a
		// labeled button (`core/density/geometry.ts`).
		// When a text label is present the component sets `data-has-label`, which
		// overrides `py` with the matching control step. A labeled button thus
		// aligns with the Input and Select chrome of the same size (md → 38px).
		dan.text.chip,
		...shaku.icon.slot.base,
		dan.gap.button,
		dan.space.button.base,
		dan.radius.button,
		dan.space.button.label,
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
		// even-sided. `not-data-has-label` yields to the base padding once a
		// label is present.
		bare: [focus.inset, dan.space.button.bare],
	},
	// Opt into the wide palette: Button's `color` axis carries the standard set
	// plus the extended hues (rose / violet / sky), matching Badge.
	palette: definePalette(
		{
			solid: [extended.solid.bg, extended.solid.text, extended.solid.hover],
			soft: [extended.soft.bg, extended.soft.text, extended.soft.hover],
			outline: [extended.outline.ring, extended.outline.text, extended.outline.hover],
			plain: [extended.plain.text, extended.plain.hover],
			bare: [extended.bare.text, extended.bare.hover],
		},
		// Synthetic color entry: inherits parent text color with a hover wash on non-disabled elements.
		{ inherit: ['text-inherit', 'not-disabled:not-data-disabled:hover:bg-current/15'] },
	),
	// `inherit` is the text color around the button, and a text color cannot fill
	// a button. A solid or a soft button with `inherit` thus paints the fill of
	// the default color. A compound rule comes after the palette pair, so its
	// classes win the merge.
	compound: (['solid', 'soft'] as const).map((variant) => ({
		variant,
		color: 'inherit',
		class: [extended[variant].bg.zinc, extended[variant].text.zinc, extended[variant].hover.zinc],
	})),
	defaults: { variant: 'solid', color: 'zinc' },
	skeleton: button,
})

/** The size scale of {@link Button}: the steps of its text, gap, padding, radius, and skeleton box. */
export const scale = defineScale(
	dan.text.chip,
	dan.gap.button,
	dan.space.button.base,
	dan.radius.button,
	dan.size.button.base,
	dan.size.button.width,
)

/** Recipe variant props for {@link Button} — the styling axes its kata exposes (`variant`, `color`) and the `size` step, for consumers composing custom slots. */
export type ButtonVariants = Omit<VariantProps<typeof k>, 'variant' | 'color'> & {
	/**
	 * The fill style of the button. When the prop is unset in a surface that sets
	 * a variant, such as the actions of an alert, the button takes that variant.
	 * @defaultValue 'solid'
	 */
	variant?: VariantProps<typeof k>['variant']
	/**
	 * The palette color of the button. When the prop is unset in a surface that
	 * sets a color, the button takes that color. `inherit` takes the text color
	 * around the button. A text color cannot fill a button, so a solid or a soft
	 * button with `inherit` takes the fill of `zinc`.
	 * @defaultValue 'zinc'
	 */
	color?: VariantProps<typeof k>['color']
	/** The density step. Omit it to take the step of the nearest density scope. */
	size?: ScaleStep<typeof scale>
}
