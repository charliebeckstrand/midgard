import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, ji, kasane, narabi, sen, shaku } from '../kiso'

const item = defineRecipe({
	base: [...hannou.nav, ...hannou.cursor, 'group relative', narabi.flex.row, 'w-full', 'text-left'],
	size: {
		sm: [
			ji.size.sm,
			kasane.gap.g('1.5'),
			kasane.padding.p('1.5'),
			kasane.radius.r('1.5'),
			shaku.icon.sm,
		],
		md: [ji.size.md, kasane.gap.g('2'), kasane.padding.p('2'), kasane.radius.r('2'), shaku.icon.md],
		lg: [
			ji.size.lg,
			kasane.gap.g('2.5'),
			kasane.padding.p('2.5'),
			kasane.radius.r('2.5'),
			shaku.icon.lg,
		],
	},
	defaults: { size: 'md' },
})

export const k = {
	base: ['overflow-y-auto', narabi.flex.col, 'gap-y-4', 'h-full', 'py-6', 'px-4'],
	item,
	section: [narabi.flex.col, 'gap-0.5'],
	label: ['truncate'],
	header: [narabi.flex.row, 'justify-between', 'gap-3', '**:data-[slot=heading]:leading-none'],
	body: ['overflow-y-auto', narabi.flex.col, narabi.flex.fill, 'gap-4'],
	divider: sen.divider.top,
	footer: ['sticky bottom-0', narabi.flex.col, 'gap-0.5', 'mt-auto'],
} as const

export type SidebarItemVariants = VariantProps<typeof item>
