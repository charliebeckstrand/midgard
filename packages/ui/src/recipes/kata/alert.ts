import { defineRecipe, iro, ji, palette, type VariantPropsOf } from '..'

const { solid, soft, outline, plain } = iro.palette

export const k = defineRecipe({
	base: ['flex w-fit items-center', 'p-4', 'gap-sm', ji.size.md, 'rounded-lg'],
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
		title: [ji.size.lg, 'leading-tight font-semibold'],
		description: ['leading-tight', 'col-start-2'],
		content: ['flex-1 min-w-0', 'gap-md'],
		body: 'col-start-2',
		actions: ['flex items-center', 'gap-xs'],
		close: 'shrink-0',
	},
	defaults: { variant: 'soft', color: 'zinc' },
})

export type AlertVariants = VariantPropsOf<typeof k>
