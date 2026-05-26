import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, ji, sen } from '../kiso'

const list = defineRecipe({
	base: ['flex flex-wrap items-center', 'gap-2', 'break-words', ji.md],
})

const item = defineRecipe({
	base: ['inline-flex items-center', 'gap-2'],
	current: {
		true: [iro.text.default, 'font-normal'],
		false: '',
	},
	defaults: { current: false },
})

const link = defineRecipe({
	base: ['rounded-sm', sen.focus.ring],
	current: {
		true: [iro.text.default, 'font-normal'],
		false: [iro.text.muted, 'hover:text-zinc-950', 'dark:hover:text-white'],
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
}

export type BreadcrumbItemVariants = VariantProps<typeof item>
export type BreadcrumbLinkVariants = VariantProps<typeof link>
