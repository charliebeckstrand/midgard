import { defineRecipe } from '../../core/recipe'
import { iro, ji, kasane, omote, sen, ugoki } from '../kiso'

const content = defineRecipe({
	base: [iro.text.default, 'font-medium', 'whitespace-nowrap', 'pointer-events-none'],
	size: {
		sm: [kasane.p('1'), kasane.r('1'), ji.sm],
		md: [kasane.p('2'), kasane.r('2'), ji.md],
		lg: [kasane.p('3'), kasane.r('3'), ji.lg],
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
