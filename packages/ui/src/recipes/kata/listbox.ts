import { iro } from '../iro'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { take } from '../take'
import { control } from './_control'

export const listbox = {
	button: [
		'flex items-center',
		'text-left',
		...control.field,
		control.size.md,
		maru.rounded.lg,
		'appearance-none',
		...sawari.cursor,
	],
	options: take.popup,
	panel: 'relative min-w-full',
	value: 'flex-1 min-w-0 truncate',
	chevron: ['flex items-center pointer-events-none', iro.text.muted],
	option: [...sawari.item, ...narabi.item],
	affix: ['flex items-center min-w-0', '*:data-[slot=icon]:pointer-events-none', ...iro.text.muted],
	prefix: control.affix.prefix,
	suffix: control.affix.suffix,
}
