import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, ji, kasane, narabi, sen, shaku } from '../kiso'

const item = defineRecipe({
	base: [...hannou.nav, ...hannou.cursor, 'group relative', narabi.row, 'w-full', 'text-left'],
	size: {
		sm: [ji.sm, kasane.g('1.5'), kasane.p('1.5'), kasane.r('1.5'), shaku.icon.sm],
		md: [ji.md, kasane.g('2'), kasane.p('2'), kasane.r('2'), shaku.icon.md],
		lg: [ji.lg, kasane.g('2.5'), kasane.p('2.5'), kasane.r('2.5'), shaku.icon.lg],
	},
	defaults: { size: 'md' },
})

export const k = {
	base: ['overflow-y-auto', narabi.col, 'gap-y-4', 'h-full', 'py-6', 'px-4'],
	item,
	section: [narabi.col, 'gap-0.5'],
	label: ['truncate'],
	header: [narabi.row, 'justify-between', 'gap-3', '**:data-[slot=heading]:leading-none'],
	body: ['overflow-y-auto', narabi.col, narabi.fill, 'gap-4'],
	divider: sen.divider.top,
	footer: ['sticky bottom-0', narabi.col, 'gap-0.5', 'mt-auto'],
} as const

export type SidebarItemVariants = VariantProps<typeof item>
