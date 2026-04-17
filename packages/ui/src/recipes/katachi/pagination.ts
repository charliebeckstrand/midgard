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
			kumi.center.inline,
			'relative',
			'min-w-9',
			'px-2 py-1.5',
			'text-sm/6 font-medium',
			ki.ring,
			maru.rounded,
			sawari.cursor,
		],
		current: {
			true: [sumi.text],
			false: [sumi.textMuted, sumi.textHover],
		},
		defaults: { current: false as const },
	},
	gap: [
		kumi.center.inline,
		'min-w-9',
		'text-sm/6',
		sumi.textMuted,
		'select-none',
	],
	nav: [
		kumi.center.inline,
		'gap-1 px-2 py-1.5',
		'text-sm/6 font-medium',
		sumi.textMuted,
		sumi.textHover,
		ki.ring,
		yasumi.disabled,
		maru.rounded,
		sawari.cursor,
	],
}
