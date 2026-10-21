import { defineScale, type ScaleStep } from '../../core/density'
import { defineKata, definePalette, type VariantProps } from '../../core/recipe'
import { dan, hannou, ji, kokkaku, narabi, sen, shaku } from '../kiso'

const { cursor, disabled } = hannou
const { weight } = ji
const { button } = kokkaku
const { flex } = narabi
const { focus, ring } = sen

export const k = defineKata(
	{
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
			outline: [...ring.line[1].inset, focus.inset],
			plain: focus.inset,
			// Icon-only floor: a square pad per step keeps an icon-only bare button
			// even-sided. `not-data-has-label` yields to the base padding once a
			// label is present.
			bare: [focus.inset, dan.space.button.bare],
		},
		// One literal class string for each variant and color. `inherit` takes the text
		// color around the button. A text color cannot fill a button, so a solid or a
		// soft button with `inherit` paints the fill of zinc, the default color.
		palette: definePalette({
			solid: {
				zinc: 'bg-zinc-600 text-white not-disabled:not-data-disabled:hover:bg-zinc-700',
				red: 'bg-red-600 text-white not-disabled:not-data-disabled:hover:bg-red-700',
				amber: 'bg-amber-500 text-amber-950 not-disabled:not-data-disabled:hover:bg-amber-600',
				green: 'bg-green-700 text-white not-disabled:not-data-disabled:hover:bg-green-800',
				blue: 'bg-blue-600 text-white not-disabled:not-data-disabled:hover:bg-blue-700',
				rose: 'bg-rose-600 text-white not-disabled:not-data-disabled:hover:bg-rose-700',
				violet: 'bg-violet-600 text-white not-disabled:not-data-disabled:hover:bg-violet-700',
				sky: 'bg-sky-700 text-white not-disabled:not-data-disabled:hover:bg-sky-800',
				inherit: 'bg-zinc-600 text-white not-disabled:not-data-disabled:hover:bg-zinc-700',
			},
			soft: {
				zinc: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 not-disabled:not-data-disabled:hover:bg-zinc-500/30',
				red: 'bg-red-500/15 text-red-700 dark:text-red-400 not-disabled:not-data-disabled:hover:bg-red-500/30',
				amber:
					'bg-amber-500/15 text-amber-800 dark:text-amber-400 not-disabled:not-data-disabled:hover:bg-amber-500/30',
				green:
					'bg-green-500/15 text-green-800 dark:text-green-400 not-disabled:not-data-disabled:hover:bg-green-500/30',
				blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 not-disabled:not-data-disabled:hover:bg-blue-500/30',
				rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 not-disabled:not-data-disabled:hover:bg-rose-500/30',
				violet:
					'bg-violet-500/15 text-violet-700 dark:text-violet-400 not-disabled:not-data-disabled:hover:bg-violet-500/30',
				sky: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 not-disabled:not-data-disabled:hover:bg-sky-500/30',
				inherit:
					'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 not-disabled:not-data-disabled:hover:bg-zinc-500/30',
			},
			outline: {
				zinc: 'ring-zinc-800 dark:ring-zinc-600 text-zinc-700 dark:text-zinc-400 not-disabled:not-data-disabled:hover:bg-zinc-500/15',
				red: 'ring-red-600 dark:ring-red-700 text-red-700 dark:text-red-400 not-disabled:not-data-disabled:hover:bg-red-500/15',
				amber:
					'ring-amber-500 dark:ring-amber-600 text-amber-800 dark:text-amber-400 not-disabled:not-data-disabled:hover:bg-amber-500/15',
				green:
					'ring-green-600 dark:ring-green-700 text-green-800 dark:text-green-400 not-disabled:not-data-disabled:hover:bg-green-500/15',
				blue: 'ring-blue-600 dark:ring-blue-700 text-blue-700 dark:text-blue-400 not-disabled:not-data-disabled:hover:bg-blue-500/15',
				rose: 'ring-rose-600 dark:ring-rose-700 text-rose-700 dark:text-rose-400 not-disabled:not-data-disabled:hover:bg-rose-500/15',
				violet:
					'ring-violet-600 dark:ring-violet-700 text-violet-700 dark:text-violet-400 not-disabled:not-data-disabled:hover:bg-violet-500/15',
				sky: 'ring-sky-600 dark:ring-sky-700 text-sky-700 dark:text-sky-400 not-disabled:not-data-disabled:hover:bg-sky-500/15',
				inherit: 'text-inherit not-disabled:not-data-disabled:hover:bg-current/15',
			},
			plain: {
				zinc: 'text-zinc-700 dark:text-zinc-400 not-disabled:not-data-disabled:hover:bg-zinc-500/15',
				red: 'text-red-700 dark:text-red-400 not-disabled:not-data-disabled:hover:bg-red-500/15',
				amber:
					'text-amber-800 dark:text-amber-400 not-disabled:not-data-disabled:hover:bg-amber-500/15',
				green:
					'text-green-800 dark:text-green-400 not-disabled:not-data-disabled:hover:bg-green-500/15',
				blue: 'text-blue-700 dark:text-blue-400 not-disabled:not-data-disabled:hover:bg-blue-500/15',
				rose: 'text-rose-700 dark:text-rose-400 not-disabled:not-data-disabled:hover:bg-rose-500/15',
				violet:
					'text-violet-700 dark:text-violet-400 not-disabled:not-data-disabled:hover:bg-violet-500/15',
				sky: 'text-sky-700 dark:text-sky-400 not-disabled:not-data-disabled:hover:bg-sky-500/15',
				inherit: 'text-inherit not-disabled:not-data-disabled:hover:bg-current/15',
			},
			bare: {
				zinc: 'text-zinc-500 dark:text-zinc-400 not-disabled:not-data-disabled:hover:text-zinc-950 dark:not-disabled:not-data-disabled:hover:text-white',
				red: 'text-red-600 dark:text-red-500 not-disabled:not-data-disabled:hover:text-red-700 dark:not-disabled:not-data-disabled:hover:text-red-400',
				amber:
					'text-amber-700 dark:text-amber-500 not-disabled:not-data-disabled:hover:text-amber-800 dark:not-disabled:not-data-disabled:hover:text-amber-400',
				green:
					'text-green-700 dark:text-green-500 not-disabled:not-data-disabled:hover:text-green-800 dark:not-disabled:not-data-disabled:hover:text-green-400',
				blue: 'text-blue-600 dark:text-blue-500 not-disabled:not-data-disabled:hover:text-blue-700 dark:not-disabled:not-data-disabled:hover:text-blue-400',
				rose: 'text-rose-600 dark:text-rose-500 not-disabled:not-data-disabled:hover:text-rose-700 dark:not-disabled:not-data-disabled:hover:text-rose-400',
				violet:
					'text-violet-600 dark:text-violet-400 not-disabled:not-data-disabled:hover:text-violet-700 dark:not-disabled:not-data-disabled:hover:text-violet-400',
				sky: 'text-sky-700 dark:text-sky-500 not-disabled:not-data-disabled:hover:text-sky-700 dark:not-disabled:not-data-disabled:hover:text-sky-400',
				inherit: 'text-inherit not-disabled:not-data-disabled:hover:bg-current/15',
			},
		}),
		defaults: { variant: 'solid', color: 'zinc' },
	},
	{ skeleton: button },
)

/** The size scale of {@link Button}: the steps of its text, gap, padding, radius, and skeleton box. */
export const scale = defineScale(
	dan.text.chip,
	dan.gap.button,
	dan.space.button.base,
	dan.radius.button,
	dan.size.button.base,
	dan.size.button.width,
)

/** Recipe variant props for {@link Button}: the styling axes its kata exposes (`variant`, `color`) and the `size` step, for consumers composing custom slots. */
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
