import { ji, sawari } from '../../core/recipe'

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
		...sawari.nav,
		...sawari.cursor,
		'gap-sm',
		ji.size.md,
		'text-left font-medium',
		'rounded-lg',
	],
}
