import { tv } from 'tailwind-variants'
import { iro, ji, omote, sen } from '../../core/recipe'

const content = tv({
	base: [iro.text.default, 'font-medium', 'whitespace-nowrap', 'rounded-lg', 'pointer-events-none'],
	variants: {
		size: {
			sm: ['px-xs py-xs', ji.size.sm],
			md: ['px-sm py-sm', ji.size.md],
			lg: ['px-md py-md', ji.size.lg],
		},
	},
	defaultVariants: { size: 'md' },
})

export const k = {
	trigger: 'inline-flex items-center',
	triggerEnabled: 'cursor-help *:cursor-help',
	portal: 'z-100',
	content,
	surface: {
		default: omote.popover,
		glass: [omote.glass, sen.outline],
	},
}
