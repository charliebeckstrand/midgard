import { defineKata, definePalette, type VariantProps } from '../../core/recipe'
import { dan, iro, kasane, narabi, sen } from '../kiso'

const { palette } = iro
const { rounded } = kasane
const { flex } = narabi
const { forced, ring } = sen

/**
 * Alert kata. The padding, the text, and the title take the step of the
 * nearest density scope, and Icon takes the same step. The close button is
 * centered on the height of the alert. At `md` the alert is `p-4` with
 * `text-base` and a `text-lg` title.
 *
 * Soft and solid draw the alert with only a background, and the `ring-1` of
 * outline is a box-shadow. Forced colors remove both, so the base carries a
 * forced outline to keep the edge of each variant.
 */
export const k = defineKata({
	base: [
		flex.row,
		'w-fit',
		dan.space.alert,
		dan.gap.scale.sm,
		rounded.lg,
		dan.text.body,
		forced.outline,
	],
	variant: {
		outline: ring.line[1].inset,
	},
	// The colors at rest, from the palette of iro. An alert takes no hover.
	palette: definePalette({
		solid: palette.solid,
		soft: palette.soft,
		outline: palette.outline,
		plain: palette.plain,
	}),
	slots: {
		icon: 'shrink-0 self-center',
		// The title size is `text-lg` at `md`, one rung above `dan.text.body` at each
		// step. Beside an icon, the title centers on the icon.
		title: {
			base: [dan.text.title, 'font-semibold'],
			columns: { true: 'self-center', false: '' },
		},
		description: ['leading-tight', 'col-start-2'],
		// The content is one column, or two columns beside an icon (`columns`). The
		// parts after the title take the second column, and in one column
		// `col-start-2` has no effect.
		content: {
			base: ['flex-1', 'min-w-0', dan.gap.scale.sm],
			columns: { true: ['grid grid-cols-[auto_minmax(0,1fr)]', dan.gap.x.sm], false: flex.col },
		},
		body: 'col-start-2',
		actions: [flex.row, dan.gap.scale.xs, 'col-start-2'],
		close: [flex.row, 'shrink-0 self-center'],
	},
	defaults: { variant: 'soft', color: 'zinc', columns: false },
})

/** Recipe variant props for {@link Alert}: the styling axes its kata exposes (`variant`, `color`), for consumers composing custom slots. */
export type AlertVariants = Omit<VariantProps<typeof k>, 'variant' | 'color' | 'columns'> & {
	/** The fill style of the alert. @defaultValue 'soft' */
	variant?: VariantProps<typeof k>['variant']
	/**
	 * The palette color of the alert. It replaces the color of the `severity`.
	 * With no `color`, a `severity` sets its own color: blue, green, amber, or
	 * red.
	 *
	 * @defaultValue 'zinc'
	 */
	color?: VariantProps<typeof k>['color']
}
