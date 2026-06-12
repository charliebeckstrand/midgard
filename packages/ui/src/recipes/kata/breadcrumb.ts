import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen } from '../kiso'

const { fg } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen

const list = defineRecipe({
	base: [flex.row, 'flex-wrap', 'gap-2', 'break-words', size.md],
})

const item = defineRecipe({
	base: [flex.inline, 'gap-2'],
	current: {
		true: [text.default, weight.normal],
		false: '',
	},
	defaults: { current: false },
})

const link = defineRecipe({
	base: [rounded.sm, focus.ring],
	current: {
		true: [text.default, weight.normal],
		false: [text.muted, fg.hover],
	},
	defaults: { current: false },
})

const separator = defineRecipe({
	base: [...text.muted, '[&>svg]:size-3.5'],
})

export const k = {
	list,
	item,
	link,
	separator,
	skeleton: kokkaku.breadcrumb,
} as const

export type BreadcrumbItemVariants = VariantProps<typeof item>
export type BreadcrumbLinkVariants = VariantProps<typeof link>
