import { defineRecipe, ji, sawari, sen, take, type VariantPropsOf } from '../../core/recipe'

const item = defineRecipe({
	base: [
		...sawari.nav,
		...sawari.cursor,
		'group relative',
		'flex w-full items-center',
		'text-left',
		'rounded-lg',
	],
	size: {
		sm: [ji.size.sm, 'gap-xs', 'p-1.5', take.icon.sm],
		md: [ji.size.md, 'gap-sm', 'p-2', take.icon.md],
		lg: [ji.size.lg, 'gap-md', 'p-2.5', take.icon.lg],
	},
	defaults: { size: 'md' },
})

export const k = {
	base: ['overflow-y-auto', 'flex flex-col gap-y-4', 'h-full', 'py-6', 'px-4'],
	item,
	section: ['flex flex-col', 'gap-0.5'],
	label: ['truncate'],
	header: ['flex items-center justify-between', 'gap-md', '**:data-[slot=heading]:leading-none'],
	body: ['overflow-y-auto', 'flex flex-1 flex-col', 'gap-lg'],
	divider: sen.divider,
	footer: ['sticky bottom-0', 'flex flex-col', 'gap-0.5', 'mt-auto'],
}

export type SidebarItemVariants = VariantPropsOf<typeof item>
