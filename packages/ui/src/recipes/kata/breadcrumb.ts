import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'

const list = defineRecipe({
	base: [narabi.flex.row, 'flex-wrap', 'gap-2', 'break-words', ji.size.md],
})

const item = defineRecipe({
	base: [narabi.flex.inline, 'gap-2'],
	current: {
		true: [iro.text.default, ji.weight.normal],
		false: '',
	},
	defaults: { current: false },
})

const link = defineRecipe({
	base: [kasane.radius.rounded.sm, sen.focus.ring],
	current: {
		true: [iro.text.default, ji.weight.normal],
		false: [iro.text.muted, hannou.text.hover],
	},
	defaults: { current: false },
})

const separator = defineRecipe({
	base: [...iro.text.muted, '[&>svg]:size-3.5'],
})

export const k = {
	list,
	item,
	link,
	separator,
} as const

export type BreadcrumbItemVariants = VariantProps<typeof item>
export type BreadcrumbLinkVariants = VariantProps<typeof link>
