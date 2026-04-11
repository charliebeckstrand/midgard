import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const pagination = {
	base: 'flex list-none gap-1',
	list: 'flex list-none items-center gap-1 m-0 p-0',
	page: {
		base: [
			ki.ring,
			maru.rounded,
			narabi.center.inline,
			'relative min-w-9 px-2 py-1.5 text-sm/6 font-medium',
			sawari.cursor,
			'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)]',
		],
		current: {
			true: [sumi.text, omote.tintBefore],
			false: [sumi.textMuted, sumi.textHover],
		},
		defaults: { current: false as const },
	},
	gap: [sumi.textMuted, narabi.center.inline, 'min-w-9 text-sm/6', 'select-none'],
	nav: [
		ki.ring,
		sumi.textMuted,
		sumi.textHover,
		maru.rounded,
		yasumi.disabled,
		narabi.center.inline,
		'gap-1 px-2 py-1.5 text-sm/6 font-medium',
		sawari.cursor,
	],
}
