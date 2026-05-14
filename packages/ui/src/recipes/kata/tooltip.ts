import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { omote } from '../ryu/omote'
import { sen } from '../ryu/sen'

export const tooltip = {
	trigger: '',
	triggerEnabled: 'cursor-help *:cursor-help',
	portal: 'z-100',
	content: [
		'px-sm',
		'py-sm',
		ji.size.md,
		'font-medium',
		'whitespace-nowrap',
		'rounded-lg',
		iro.text.default,
		'pointer-events-none',
	],
	surface: {
		default: omote.popover,
		glass: [omote.glass, sen.outline],
	},
}

export { tooltip as k }
