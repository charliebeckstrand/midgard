import { defineRecipe, iro, ji, omote, sen } from '../../core/recipe'

const content = defineRecipe({
	base: [iro.text.default, 'font-medium', 'whitespace-nowrap', 'rounded-lg', 'pointer-events-none'],
	size: {
		sm: ['px-xs py-xs', ji.size.sm],
		md: ['px-sm py-sm', ji.size.md],
		lg: ['px-md py-md', ji.size.lg],
	},
	defaults: { size: 'md' },
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
