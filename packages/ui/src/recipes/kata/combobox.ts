import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { control } from '../waku/control'

export const combobox = {
	input: ['block', 'truncate', ...control.field, control.size.md, 'rounded-lg'],
	chevron: ['pl-0 pr-3 -m-px'],
	options: 'max-h-60',
	empty: ['hidden only:block', 'p-2', ji.size.sm, iro.text.muted],
}

export { combobox as k }
