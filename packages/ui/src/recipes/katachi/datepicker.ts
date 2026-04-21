import { iro } from '../iro'
import { ki } from '../ki'
import { maru } from '../maru'
import { take } from '../take'
import { waku } from '../waku'
import { controlSize } from './_control-size'

export const datepicker = {
	control: {
		default: [...waku.control.surface],
		glass: [],
	},
	button: [
		...waku.inputBase,
		'block',
		controlSize.md,
		take.listbox.padding,
		'text-left',
		maru.rounded.lg,
		'appearance-none',
		'cursor-pointer',
	],
	value: 'block truncate',
	icon: [take.listbox.icon, 'flex items-center', 'pr-3', iro.text.muted, 'pointer-events-none'],
	clearButton: [
		'p-1 -m-1',
		'rounded-md',
		ki.inset,
		...iro.text.hover,
		'pointer-events-auto',
		'cursor-pointer',
	],
}
