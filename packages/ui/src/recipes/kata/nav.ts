import { hannou, ji, kasane, narabi, shaku } from '../kiso'

const { nav, navInner, cursor } = hannou
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { icon } = shaku

export const k = {
	list: {
		base: 'flex',
		orientation: {
			vertical: ['flex-col', 'gap-0.5'],
			horizontal: ['flex-row', 'gap-1'],
		},
	},
	item: {
		/** The row (`<li>`) owns the painted chrome; the focus ring tracks the inner button via `:has()`. */
		base: [
			'group relative',
			flex.row,
			'w-full',
			'p-2',
			...nav,
			...cursor,
			'gap-2',
			size.md,
			weight.medium,
			rounded.lg,
		],
		/** The inner button/link: transparent content strip filling the row. Icon sizing targets direct children. */
		inner: [...navInner, icon.md, 'gap-2'],
		/** Wrapper for a prefix/suffix slot; sits outside the inner button, above the active indicator. */
		affix: ['relative', 'z-10', flex.row, 'shrink-0'],
	},
} as const
