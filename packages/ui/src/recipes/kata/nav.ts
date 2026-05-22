import { hannou, ji } from '../kiso'

export const k = {
	list: {
		base: 'flex',
		orientation: {
			vertical: ['flex-col', 'gap-0.5'],
			horizontal: ['flex-row', 'gap-xs'],
		},
	},
	item: [
		'group relative flex w-full items-center',
		'p-2',
		...hannou.nav,
		...hannou.cursor,
		'gap-sm',
		ji.md,
		'text-left font-medium',
	],
}
