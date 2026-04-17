import { maru } from '../maru'
import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { take } from '../take'
import { waku } from '../waku'

export const listbox = {
	button: [
		'block',
		'text-left',
		...waku.inputBase,
		take.control.md,
		take.listbox.padding,
		maru.rounded,
		'appearance-none',
	],
	options: take.popup,
	panel: 'relative min-w-full',
	value: 'block truncate',
	chevron: [take.control.icon, take.listbox.icon, sumi.textMuted],
	option: [...sawari.item, ...narabi.item],
}
