import { iro } from '../iro'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { take } from '../take'
import { control } from './_control'

export const listbox = {
	button: [
		'block',
		'text-left',
		...control.field,
		control.size.md,
		take.listbox.padding,
		maru.rounded.lg,
		'appearance-none',
		'cursor-pointer',
	],
	options: take.popup,
	panel: 'relative min-w-full',
	value: 'block truncate',
	chevron: [control.icon, take.listbox.icon, iro.text.muted],
	option: [...sawari.item, ...narabi.item],
}
