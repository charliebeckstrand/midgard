import { defineRecipe, type VariantProps } from '../../core/recipe'
import { basePalette } from '../katakana'
import { iro, ji, kasane, narabi } from '../kiso'

const { palette } = iro
const { size, weight, leading } = ji
const { rounded } = kasane
const { flex } = narabi

export const k = defineRecipe({
	base: [flex.row, 'w-fit', 'p-4', 'gap-2', rounded.lg, size.md],
	variant: {
		outline: 'ring-1 ring-inset',
	},
	palette: basePalette(palette),
	slots: {
		icon: 'shrink-0 self-center',
		title: [size.lg, leading.tight, weight.semibold],
		description: [leading.tight, 'col-start-2'],
		content: [flex.fill, 'min-w-0', 'gap-2'],
		body: 'col-start-2',
		actions: [flex.row, 'gap-1'],
		close: 'shrink-0',
	},
	defaults: { variant: 'soft', color: 'zinc' },
})

export type AlertVariants = VariantProps<typeof k>
