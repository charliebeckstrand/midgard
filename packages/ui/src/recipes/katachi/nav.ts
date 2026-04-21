import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sawari } from '../sawari'

export const nav = {
	list: {
		base: 'flex',
		orientation: {
			vertical: ['flex-col', kumi.gap.xs],
			horizontal: ['flex-row', kumi.gap.sm],
		},
	},
	item: [
		'group relative flex w-full items-center',
		'p-2',
		kumi.gap.md,
		ji.size.md,
		'text-left font-medium',
		...sawari.navItem,
		maru.rounded.lg,
		sawari.cursor,
	],
}
