import { ji } from '../ryu/ji'
import { kumi } from '../ryu/kumi'
import { maru } from '../ryu/maru'
import { sawari } from '../ryu/sawari'

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
		...sawari.nav,
		kumi.gap.md,
		ji.size.md,
		'text-left font-medium',
		maru.rounded.lg,
		'cursor-pointer',
	],
}
