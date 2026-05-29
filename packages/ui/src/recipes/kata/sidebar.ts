import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, ji, kasane, narabi, sen, shaku } from '../kiso'

const { nav, cursor } = hannou
const { size } = ji
const { gap, padding, radius } = kasane
const { flex } = narabi
const { divider } = sen
const { icon } = shaku

const item = defineRecipe({
	base: [...nav, ...cursor, 'group relative', flex.row, 'w-full', 'text-left'],
	size: {
		sm: [size.sm, gap.g('1.5'), padding.p('1.5'), radius.r('1.5'), icon.sm],
		md: [size.md, gap.g('2'), padding.p('2'), radius.r('2'), icon.md],
		lg: [size.lg, gap.g('2.5'), padding.p('2.5'), radius.r('2.5'), icon.lg],
	},
	defaults: { size: 'md' },
})

export const k = {
	base: ['overflow-y-auto', flex.col, 'gap-y-4', 'h-full', 'p-6'],
	item,
	section: [flex.col, 'gap-0.5'],
	label: ['truncate'],
	header: [flex.row, 'justify-between', 'gap-3'],
	body: ['overflow-y-auto', flex.col, flex.fill, 'gap-4'],
	divider: divider.top,
	footer: ['sticky bottom-0', flex.col, 'gap-0.5', 'mt-auto'],
} as const

export type SidebarItemVariants = VariantProps<typeof item>
