import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const tooltip = {
	trigger: 'inline-flex',
	content: [
		omote.popover,
		maru.rounded,
		sumi.text,
		take.px.md,
		take.py.md,
		take.text.md,
		'z-50',
		'font-medium',
		'whitespace-nowrap pointer-events-none',
	],
}
