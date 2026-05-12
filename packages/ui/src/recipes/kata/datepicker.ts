import { iro } from '../ryu/iro'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'
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
	icon: ['flex items-center', iro.text.muted, 'pointer-events-none'],
	clearButton: [
		'p-1 -m-1',
		'rounded-md',
		sen.focus.inset,
		...iro.text.hover,
		'pointer-events-auto',
	],
}

export { datepicker as k }
