import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { ma } from '../ryu/ma'
import { maru } from '../ryu/maru'
import { omote } from '../ryu/omote'

export const tooltip = {
	trigger: 'inline-flex cursor-help *:cursor-help',
	portal: 'z-100',
	content: [
		ma.px.md,
		ma.py.md,
		ji.size.md,
		'font-medium',
		'whitespace-nowrap',
		omote.popover,
		maru.rounded.lg,
		iro.text.default,
		'pointer-events-none',
	],
}
