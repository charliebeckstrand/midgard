import { iro } from '../iro'
import { maru } from '../maru'
import { sawari } from '../sawari'
import { sen } from '../sen'
import { take } from '../take'
import { control } from './_control'

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
