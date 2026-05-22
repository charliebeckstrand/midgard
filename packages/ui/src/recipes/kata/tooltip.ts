import { defineRecipe } from '../../core/recipe'
import { iro, ji, omote, sen, ugoki } from '../kiso'

const content = defineRecipe({
	base: [iro.text.default, 'font-medium', 'whitespace-nowrap', 'rounded-lg', 'pointer-events-none'],
	size: {
		sm: ['px-xs py-xs', ji.sm],
		md: ['px-sm py-sm', ji.md],
		lg: ['px-md py-md', ji.lg],
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
	motion: ugoki.tooltip,
}
