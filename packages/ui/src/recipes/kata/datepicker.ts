import { iro } from '../ryu/iro'
import { sawari } from '../ryu/sawari'
import { control } from '../waku/control'

export const datepicker = {
	control: {
		default: control.surface.default,
		glass: [],
	},
	button: [
		'flex items-center justify-between',
		...control.field,
		...control.size.md,
		'text-left',
		'rounded-lg',
		'appearance-none',
		...sawari.cursor,
	],
	value: 'block truncate',
	icon: ['flex items-center', 'pointer-events-none', iro.text.muted],
}

export { datepicker as k }
