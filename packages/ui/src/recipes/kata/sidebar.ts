import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { hannou, ji, kasane, sen, shaku } from '../kiso'

const item = defineRecipe({
	base: [
		...hannou.nav,
		...hannou.cursor,
		'group relative',
		'flex w-full items-center',
		'text-left',
	],
	size: {
		sm: [ji.sm, kasane.g('0.75'), 'p-1.5', kasane.r('1.5'), shaku.icon.sm],
		md: [ji.md, kasane.g('1'), 'p-2', kasane.r('2'), shaku.icon.md],
		lg: [ji.lg, kasane.g('1.25'), 'p-2.5', kasane.r('2.5'), shaku.icon.lg],
	},
	defaults: { size: 'md' },
})

export const k = {
	base: ['overflow-y-auto', 'flex flex-col gap-y-4', 'h-full', 'py-6', 'px-4'],
	item,
	section: ['flex flex-col', 'gap-0.5'],
	label: ['truncate'],
	header: ['flex items-center justify-between', 'gap-3', '**:data-[slot=heading]:leading-none'],
	body: ['overflow-y-auto', 'flex flex-1 flex-col', 'gap-4'],
	divider: sen.divider,
	footer: ['sticky bottom-0', 'flex flex-col', 'gap-0.5', 'mt-auto'],
}

export type SidebarItemVariants = VariantPropsOf<typeof item>
