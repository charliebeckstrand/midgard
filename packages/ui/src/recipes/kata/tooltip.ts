import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { omote } from '../ryu/omote'

export const tooltip = {
	trigger: 'inline-flex cursor-help *:cursor-help',
	portal: 'z-100',
	content: [
		'px-sm',
		'py-sm',
		ji.size.md,
		'font-medium',
		'whitespace-nowrap',
		omote.popover,
		'rounded-lg',
		iro.text.default,
		'pointer-events-none',
	],
}
