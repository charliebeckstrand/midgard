import { sawari } from '../ryu/sawari'
import { control } from '../waku/control'

export const listbox = {
	button: [
		'flex items-center',
		'w-full',
		'text-left',
		...control.field,
		control.size.md,
		'rounded-lg',
		'appearance-none',
		...sawari.cursor,
	],
	options: 'max-h-60',
	panel: 'relative min-w-full',
	value: 'flex-1 min-w-0 truncate',
}

export { listbox as k }
