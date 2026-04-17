import { ma } from '../ma'
import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const tooltip = {
	trigger: 'inline-flex cursor-help *:cursor-help',
	content: [
		omote.popover,
		maru.rounded,
		sumi.text,
		ma.density.px.md,
		ma.density.py.md,
		take.text.md,
		'z-50',
		'font-medium',
		'whitespace-nowrap pointer-events-none',
	],
}
