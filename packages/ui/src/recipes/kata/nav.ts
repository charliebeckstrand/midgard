import { hannou, ji, kasane, narabi } from '../kiso'

const { nav, cursor } = hannou
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi

export const k = {
	list: {
		base: 'flex',
		orientation: {
			vertical: ['flex-col', 'gap-0.5'],
			horizontal: ['flex-row', 'gap-1'],
		},
	},
	item: {
		base: [
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
			rounded.lg,
		],
		/** Wrapper for a prefix/suffix slot — sits outside the inner button, above the active indicator. */
		affix: ['relative', 'z-10', flex.row, 'shrink-0'],
	},
} as const
