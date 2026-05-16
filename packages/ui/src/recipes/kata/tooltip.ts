import { tv } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { omote } from '../ryu/omote'
import { sen } from '../ryu/sen'

const content = tv({
	base: ['font-medium', 'whitespace-nowrap', 'rounded-lg', iro.text.default, 'pointer-events-none'],
	variants: {
		size: {
			sm: ['px-xs py-xs', ji.size.sm],
			md: ['px-sm py-sm', ji.size.md],
			lg: ['px-md py-md', ji.size.lg],
		},
	},
	defaultVariants: { size: 'md' },
})

export const tooltip = {
	trigger: 'inline-flex',
	triggerEnabled: 'cursor-help *:cursor-help',
	portal: 'z-100',
	content,
	surface: {
		default: omote.popover,
		glass: [omote.glass, sen.outline],
	},
}

export { tooltip as k }
