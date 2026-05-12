import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { narabi } from '../ryu/narabi'
import { sawari } from '../ryu/sawari'
import { control } from '../waku/control'

export const combobox = {
	input: ['block', 'truncate', ...control.field, control.size.md, 'rounded-lg'],
	affix: [
		'flex items-center min-w-0',
		'*:data-[slot=icon]:pointer-events-none',
		...iro.text.muted,
		...sawari.cursor,
	],
	prefix: control.affix.prefix,
	suffix: control.affix.suffix,
	chevron: ['pl-0 pr-3 -m-px'],
	options: 'max-h-60',
	option: [...sawari.item, ...narabi.item],
	empty: ['hidden only:block', 'p-2', ji.size.sm, iro.text.muted],
}

export { combobox as k }
