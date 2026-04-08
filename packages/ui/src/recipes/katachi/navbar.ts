import { maru } from '../maru'
import { sawari } from '../sawari'
import { sumi } from '../sumi'

export const navbar = {
	base: 'flex items-center gap-3 px-4 py-2.5',
	item: [
		...sawari.navItem,
		maru.rounded,
		'group relative flex items-center gap-2 px-2 py-1 text-sm/6 font-medium',
		sawari.cursor,
	],
	section: 'flex items-center gap-3',
	label: [sumi.textMuted, 'text-sm/6'],
	spacer: 'flex-1',
}
