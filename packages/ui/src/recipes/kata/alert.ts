import { defineRecipe, palette, type VariantProps } from '../../core/recipe'
import { iro, ji, kasane, narabi } from '../kiso'

const { solid, soft, outline, plain } = iro.palette

export const k = defineRecipe({
	base: [narabi.row, 'w-fit', 'p-4', 'gap-2', kasane.rounded.lg, ji.md],
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
		title: [ji.lg, ji.leading.tight, ji.weight.semibold],
		description: [ji.leading.tight, 'col-start-2'],
		content: [narabi.fill, 'min-w-0', 'gap-3'],
		body: 'col-start-2',
		actions: [narabi.row, 'gap-1'],
		close: 'shrink-0',
	},
	defaults: { variant: 'soft', color: 'zinc' },
})

export type AlertVariants = VariantProps<typeof k>
