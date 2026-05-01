import { iro } from '../ryu/iro'
import { maru } from '../ryu/maru'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'
import { take } from '../ryu/take'
import { control } from '../waku/control'

export const datepicker = {
	control: {
		default: control.surface.default,
		glass: [],
	},
	button: [
		...control.field,
		'block',
		control.size.md,
		take.listbox.padding,
		'text-left',
		maru.rounded.lg,
		'appearance-none',
		...sawari.cursor,
	],
	value: 'block truncate',
	icon: [take.listbox.icon, 'flex items-center', 'pr-3', iro.text.muted, 'pointer-events-none'],
	clearButton: [
		'p-1 -m-1',
		maru.rounded.md,
		sen.focus.inset,
		...iro.text.hover,
		'pointer-events-auto',
	],
}
