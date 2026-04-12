import { maru } from '../maru'
import { sawari } from '../sawari'

export const nav = {
	list: 'flex flex-col gap-0.5',
	item: [
		...sawari.navItem,
		maru.rounded,
		'group relative flex w-full items-center gap-3 px-2 py-2',
		'text-left text-sm/5 font-medium',
		sawari.cursor,
	],
}
