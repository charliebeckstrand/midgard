import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const pagination = {
	base: ['flex list-none gap-1'],
	list: 'flex list-none items-center gap-1 m-0 p-0',
	page: {
		base: [
			ki.ring,
			maru.rounded,
			kumi.centerInline,
			'relative min-w-9',
			'text-sm/6 font-medium',
			'px-2 py-1.5',
			sawari.cursor,
		],
		current: {
			true: [sumi.text],
			false: [sumi.textMuted, sumi.textHover],
		},
		defaults: { current: false as const },
	},
	gap: [sumi.textMuted, kumi.centerInline, 'min-w-9 text-sm/6', 'select-none'],
	nav: [
		kumi.centerInline,
		'text-sm/6 font-medium',
		sumi.textMuted,
		sumi.textHover,
		ki.ring,
		yasumi.disabled,
		'gap-1 px-2 py-1.5',
		maru.rounded,
		sawari.cursor,
	],
}
