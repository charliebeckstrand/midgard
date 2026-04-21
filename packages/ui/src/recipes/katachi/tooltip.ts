import { iro } from '../iro'
import { ji } from '../ji'
import { ma } from '../ma'
import { maru } from '../maru'
import { omote } from '../omote'

export const tooltip = {
	trigger: 'inline-flex cursor-help *:cursor-help',
	content: [
		'z-50',
		ma.px.md,
		ma.py.md,
		ji.size.md,
		'font-medium',
		'whitespace-nowrap',
		omote.popover,
		maru.rounded,
		iro.text.default,
		'pointer-events-none',
	],
}
