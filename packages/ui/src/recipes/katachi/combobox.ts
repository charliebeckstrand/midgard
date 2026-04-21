import { iro } from '../iro'
import { ji } from '../ji'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { take } from '../take'
import { waku } from '../waku'
import { controlIcon, controlSize } from './_control-size'

export const combobox = {
	input: [
		'block',
		'truncate',
		...waku.inputBase,
		controlSize.md,
		take.combobox.padding,
		maru.rounded.lg,
	],
	chevron: [controlIcon, take.combobox.icon, iro.text.muted],
	options: take.popup,
	option: [...sawari.item, ...narabi.item],
	empty: ['hidden only:block', 'p-2', ji.size.sm, iro.text.muted],
}
