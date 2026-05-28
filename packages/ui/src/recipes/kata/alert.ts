import { defineRecipe, palette, type VariantProps } from '../../core/recipe'
import { iro, ji, kasane, narabi } from '../kiso'

const { solid, soft, outline, plain } = iro.palette
const { size, weight, leading } = ji
const { rounded } = kasane.radius
const { row, fill } = narabi.flex

export const k = defineRecipe({
	base: [row, 'w-fit', 'p-4', 'gap-2', rounded.lg, size.md],
	variant: {
		outline: 'ring-1 ring-inset',
	},
	palette: palette({
		solid: [solid.bg, solid.text],
		soft: [soft.bg, soft.text],
		outline: [outline.ring, outline.text],
		plain: plain.text,
	}),
	slots: {
		icon: 'shrink-0 self-center',
		title: [size.lg, leading.tight, weight.semibold],
		description: [leading.tight, 'col-start-2'],
		content: [fill, 'min-w-0', 'gap-3'],
		body: 'col-start-2',
		actions: [row, 'gap-1'],
		close: 'shrink-0',
	},
	defaults: { variant: 'soft', color: 'zinc' },
})

export type AlertVariants = VariantProps<typeof k>
