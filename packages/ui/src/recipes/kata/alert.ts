import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { iro, ji, kasane, narabi } from '../kiso'
import { dan } from '../kiso/dan'

const { palette } = iro
const { weight, leading } = ji
const { rounded } = kasane
const { flex } = narabi

/** The title size: `text-lg` at `md`, one rung above `ji.ramp` at each step. */
const titleRamp = dan.text.title

/**
 * Alert kata. The padding, the text, and the title take the step of the
 * nearest density scope, and Icon takes the same step. The close button row
 * reads the title size, so the button stays on the line of the title. At `md`
 * the alert is `p-4` with `text-base` and a `text-lg` title.
 */
export const k = defineRecipe({
	base: [flex.row, 'w-fit', dan.space.alert, dan.gap.scale.sm, rounded.lg, ji.ramp],
	variant: {
		outline: 'ring-1 ring-inset',
	},
	palette: definePalette({ ...bridge.palette(palette), plain: palette.plain.text }),
	slots: {
		icon: 'shrink-0 self-center',
		title: [titleRamp, weight.semibold],
		description: [leading.tight, 'col-start-2'],
		content: [flex.fill, 'min-w-0', dan.gap.scale.sm],
		/** The two columns of the content beside an icon. */
		columns: ['grid grid-cols-[auto_minmax(0,1fr)]', dan.gap.x.sm],
		body: 'col-start-2',
		actions: [flex.row, dan.gap.scale.xs],
		close: {
			base: [flex.row, 'shrink-0'],
			// One line box of the title: the button centers on it and overhangs it into
			// the padding of the alert.
			line: ['h-lh self-start', titleRamp],
		},
	},
	defaults: { variant: 'soft', color: 'zinc' },
})

/** Recipe variant props for {@link Alert} — the styling axes its kata exposes (`variant`, `color`), for consumers composing custom slots. */
export type AlertVariants = Omit<VariantProps<typeof k>, 'variant' | 'color'> & {
	/** The fill style of the alert. @defaultValue 'soft' */
	variant?: VariantProps<typeof k>['variant']
	/** The palette color of the alert. A `severity` sets its own color in place of this one. @defaultValue 'zinc' */
	color?: VariantProps<typeof k>['color']
}
