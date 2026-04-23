import { iro } from '../iro'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { take } from '../take'
import { waku } from '../waku'
import { controlIcon, controlSize } from './_control-size'

export const listbox = {
	button: [
		'block',
		'text-left',
		...waku.inputBase,
		controlSize.md,
		take.listbox.padding,
		maru.rounded.lg,
		'appearance-none',
		'cursor-pointer',
	],
	options: take.popup,
	panel: 'relative min-w-full',
	value: 'block truncate',
	chevron: [controlIcon, take.listbox.icon, iro.text.muted],
	option: [...sawari.item, ...narabi.item],
}
