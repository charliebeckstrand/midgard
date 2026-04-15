import { ki } from '../ki'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'
import { waku } from '../waku'

export const datepicker = {
	control: {
		default: waku.control.surface,
		glass: [],
	},
	button: [
		...waku.inputBase,
		'block',
		take.control.md,
		take.listbox.padding,
		maru.rounded,
		'text-left',
		'appearance-none',
		'cursor-pointer',
	],
	value: 'block truncate',
	icon: [take.listbox.icon, 'flex items-center pr-3 pointer-events-none', sumi.textMuted],
	clearButton: [
		'pointer-events-auto cursor-pointer p-1 -m-1 rounded-md',
		ki.inset,
		...sumi.textHover,
	],
}
