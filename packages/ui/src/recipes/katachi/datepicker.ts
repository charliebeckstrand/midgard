import { ki } from '../ki'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'
import { waku } from '../waku'

export const datepicker = {
	control: {
		default: ['waku.control.surface'],
		glass: [],
	},
	button: [
		...waku.inputBase,
		'block',
		take.control.md,
		take.listbox.padding,
		'text-left',
		maru.rounded,
		'appearance-none',
		'cursor-pointer',
	],
	value: 'block truncate',
	icon: [take.listbox.icon, 'flex items-center', 'pr-3', sumi.textMuted, 'pointer-events-none'],
	clearButton: [
		'p-1 -m-1',
		'rounded-md',
		ki.inset,
		...sumi.textHover,
		'pointer-events-auto',
		'cursor-pointer',
	],
}
