import { defineRecipe } from '../../core/recipe'
import { iro, ji, kasane, narabi, omote, sen, ugoki } from '../kiso'

const content = defineRecipe({
	base: ['max-w-sm', iro.text.default, ji.weight.medium],
	size: {
		sm: [kasane.padding.p('1'), kasane.radius.r('1'), ji.size.sm],
		md: [kasane.padding.p('2'), kasane.radius.r('2'), ji.size.md],
		lg: [kasane.padding.p('3'), kasane.radius.r('3'), ji.size.lg],
	},
	defaults: { size: 'md' },
})

export const k = {
	trigger: narabi.flex.inline,
	portal: 'z-100',
	cursor: 'cursor-help *:cursor-help',
	content,
	surface: {
		default: omote.popover,
		glass: [omote.glass, sen.ring.default],
	},
	motion: ugoki.tooltip,
} as const
