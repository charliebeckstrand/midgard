import { ma } from '../ma'
import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const tooltip = {
	trigger: 'inline-flex cursor-help *:cursor-help',
	content: [
		'z-50',
		ma.density.px.md,
		ma.density.py.md,
		take.text.md,
		'font-medium',
		'whitespace-nowrap',
		omote.popover,
		maru.rounded,
		sumi.text,
		'pointer-events-none',
	],
}
