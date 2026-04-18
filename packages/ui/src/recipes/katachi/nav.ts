import { maru } from '../maru'
import { sawari } from '../sawari'
import { take } from '../take'

export const nav = {
	list: {
		base: 'flex',
		orientation: {
			vertical: ['flex-col', take.gap.xs],
			horizontal: ['flex-row', take.gap.sm],
		},
	},
	item: [
		'group relative flex w-full items-center',
		'p-2',
		take.gap.md,
		take.text.sm,
		'text-left font-medium',
		...sawari.navItem,
		maru.rounded,
		sawari.cursor,
	],
}
