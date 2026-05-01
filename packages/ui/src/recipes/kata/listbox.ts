import { iro } from '../ryu/iro'
import { maru } from '../ryu/maru'
import { narabi } from '../ryu/narabi'
import { sawari } from '../ryu/sawari'
import { control } from '../waku/control'

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
	options: 'max-h-60',
	panel: 'relative min-w-full',
	value: 'flex-1 min-w-0 truncate',
	chevron: ['flex items-center pointer-events-none', iro.text.muted],
	option: [...sawari.item, ...narabi.item],
	affix: ['flex items-center min-w-0', '*:data-[slot=icon]:pointer-events-none', ...iro.text.muted],
	prefix: control.affix.prefix,
	suffix: control.affix.suffix,
}
