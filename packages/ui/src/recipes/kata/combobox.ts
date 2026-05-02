import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { narabi } from '../ryu/narabi'
import { sawari } from '../ryu/sawari'
import { take } from '../ryu/take'
import { control } from '../waku/control'

export const combobox = {
	input: [
		'block',
		'truncate',
		...control.field,
		control.size.md,
		take.combobox.padding,
		'rounded-lg',
	],
	chevron: [control.icon, take.combobox.icon, iro.text.muted],
	options: 'max-h-60',
	option: [...sawari.item, ...narabi.item],
	empty: ['hidden only:block', 'p-2', ji.size.sm, iro.text.muted],
}
