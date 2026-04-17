import { maru } from '../maru'
import { sawari } from '../sawari'

export const nav = {
	list: {
		base: 'flex',
		orientation: {
			vertical: 'flex-col gap-0.5',
			horizontal: 'flex-row gap-1',
		},
	},
	item: [
		'group relative flex w-full items-center',
		'gap-1.5 p-2',
		'text-left text-sm/5 font-medium',
		...sawari.navItem,
		maru.rounded,
		sawari.cursor,
	],
}
