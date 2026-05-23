import { defineRecipe } from '../../core/recipe'
import { iro, ji, omote, sen, ugoki } from '../kiso'

const content = defineRecipe({
	base: [iro.text.default, 'font-medium', 'whitespace-nowrap', 'rounded-lg', 'pointer-events-none'],
	size: {
		sm: ['px-1 py-1', ji.sm],
		md: ['px-2 py-2', ji.md],
		lg: ['px-3 py-3', ji.lg],
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
