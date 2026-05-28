import { hannou, ji, kasane, narabi } from '../kiso'

const { nav, cursor } = hannou
const { size, weight } = ji
const { radius } = kasane
const { flex } = narabi

export const k = {
	list: {
		base: 'flex',
		orientation: {
			vertical: ['flex-col', 'gap-0.5'],
			horizontal: ['flex-row', 'gap-1'],
		},
	},
	item: [
		'group relative',
		flex.row,
		'w-full',
		'p-2',
		...nav,
		...cursor,
		'gap-2',
		size.md,
		'text-left',
		weight.medium,
		radius.rounded.lg,
	],
} as const
