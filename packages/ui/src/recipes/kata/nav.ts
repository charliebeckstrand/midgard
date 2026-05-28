import { hannou, ji, kasane, narabi } from '../kiso'

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
		narabi.row,
		'w-full',
		'p-2',
		...hannou.nav,
		...hannou.cursor,
		'gap-2',
		ji.size.md,
		'text-left',
		ji.weight.medium,
		kasane.rounded.lg,
	],
} as const
