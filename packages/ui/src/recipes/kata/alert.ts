import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { iro, ji, kasane, narabi, textRamp } from '../kiso'
import { dan } from '../kiso/dan'

const { palette } = iro
const { weight, leading } = ji
const { rounded } = kasane
const { flex } = narabi

/** The title size: `text-lg` at `md`, one rung above {@link textRamp} at each step. */
const titleRamp = dan.text.title

/**
 * Alert kata. The padding, the text, and the title take the step of the
 * nearest density scope, and Icon takes the same step. The close button row
 * reads the title size, so the button stays on the line of the title. At `md`
 * the alert is `p-4` with `text-base` and a `text-lg` title.
 */
export const k = defineRecipe({
	base: [flex.row, 'w-fit', dan.space.alert, 'gap-2', rounded.lg, textRamp],
	variant: {
		outline: 'ring-1 ring-inset',
	},
	palette: definePalette({ ...bridge.palette(palette), plain: palette.plain.text }),
	slots: {
		icon: 'shrink-0 self-center',
		title: [titleRamp, weight.semibold],
		description: [leading.tight, 'col-start-2'],
		content: [flex.fill, 'min-w-0', 'gap-2'],
		body: 'col-start-2',
		actions: [flex.row, 'gap-1'],
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
export type AlertVariants = VariantProps<typeof k>
