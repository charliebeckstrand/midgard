import { maru } from '../maru'
import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { take } from '../take'
import { waku } from '../waku'

export const combobox = {
	input: [
		'block',
		'truncate',
		...waku.inputBase,
		take.control.md,
		take.combobox.padding,
		maru.rounded,
	],
	chevron: [take.control.icon, take.combobox.icon, sumi.textMuted],
	options: take.popup,
	option: [...sawari.item, ...narabi.item],
	empty: ['hidden only:block', 'p-2', take.text.sm, sumi.textMuted],
}
