import { defineRecipe, iro, ji, sen, type VariantPropsOf } from '..'

const root = defineRecipe({ base: '' })

const list = defineRecipe({
	base: ['flex flex-wrap items-center', 'gap-sm', 'break-words', ji.md],
})

const item = defineRecipe({
	base: ['inline-flex items-center', 'gap-sm'],
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
	root,
	list,
	item,
	link,
	separator,
}

export type BreadcrumbItemVariants = VariantPropsOf<typeof item>
export type BreadcrumbLinkVariants = VariantPropsOf<typeof link>
