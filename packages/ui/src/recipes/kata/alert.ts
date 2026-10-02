import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { basePalette } from '../katakana'
import { iro, ji, kasane, narabi, textRamp } from '../kiso'

const { palette } = iro
const { weight, leading } = ji
const { rounded } = kasane
const { flex } = narabi

/** The title size: `text-lg` at `md`, one rung above {@link textRamp} at each step. */
const titleRamp = 'density-text-[base,lg,xl]'

/**
 * Alert kata. The padding, the text, and the title take the step of the
 * nearest density scope, and Icon takes the same step. The close button row
 * reads the title size, so the button stays on the line of the title. At `md`
 * the alert is `p-4` with `text-base` and a `text-lg` title.
 */
export const k = defineRecipe({
	base: [flex.row, 'w-fit', 'density-p-[3,4,5]', 'gap-2', rounded.lg, textRamp],
	variant: {
		outline: 'ring-1 ring-inset',
	},
	palette: definePalette({ ...basePalette(palette), plain: palette.plain.text }),
	slots: {
		icon: 'shrink-0 self-center',
		title: [titleRamp, weight.semibold],
		description: [leading.tight, 'col-start-2'],
		content: [flex.fill, 'min-w-0', 'gap-2'],
		body: 'col-start-2',
		actions: [flex.row, 'gap-1'],
		close: [flex.row, 'shrink-0'],
		// One line box of the title: the button centers on it and overhangs it into
		// the padding of the alert.
		closeTitleRow: ['h-lh self-start', titleRamp],
	},
	defaults: { variant: 'soft', color: 'zinc' },
})

/** Recipe variant props for {@link Alert} — the styling axes its kata exposes (`variant`, `color`), for consumers composing custom slots. */
export type AlertVariants = VariantProps<typeof k>
