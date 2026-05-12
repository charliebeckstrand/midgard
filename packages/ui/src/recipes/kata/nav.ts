import { ji } from '../ryu/ji'
import { sawari } from '../ryu/sawari'

export const nav = {
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
		...sawari.nav,
		...sawari.cursor,
		'gap-sm',
		ji.size.md,
		'text-left font-medium',
		'rounded-lg',
	],
}

export { nav as k }
