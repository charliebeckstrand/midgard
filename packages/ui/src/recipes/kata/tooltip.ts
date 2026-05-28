import { defineRecipe } from '../../core/recipe'
import { iro, ji, kasane, narabi, omote, sen, ugoki } from '../kiso'

const content = defineRecipe({
	base: ['max-w-sm', iro.text.default, ji.weight.medium],
	size: {
		sm: [kasane.p('1'), kasane.r('1'), ji.sm],
		md: [kasane.p('2'), kasane.r('2'), ji.md],
		lg: [kasane.p('3'), kasane.r('3'), ji.lg],
	},
	defaults: { size: 'md' },
})

export const k = {
	trigger: narabi.inlineRow,
	portal: 'z-100',
	cursor: 'cursor-help *:cursor-help',
	content,
	surface: {
		default: omote.popover,
		glass: [omote.glass, sen.ring],
	},
	motion: ugoki.tooltip,
} as const
