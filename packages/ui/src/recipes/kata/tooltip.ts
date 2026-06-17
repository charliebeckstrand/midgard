import { defineRecipe } from '../../core/recipe'
import { iro, ji, kasane, narabi, omote, sen, ugoki } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { padding, radius } = kasane
const { flex } = narabi
const { popover, glass } = omote
const { ring } = sen
const { tooltip } = ugoki

const content = defineRecipe({
	base: ['max-w-sm', 'text-pretty', text.default, weight.medium],
	size: {
		sm: [padding.p('1'), radius.r('1'), size.sm],
		md: [padding.p('2'), radius.r('2'), size.md],
		lg: [padding.p('3'), radius.r('3'), size.lg],
	},
	defaults: { size: 'md' },
})

export const k = {
	trigger: flex.inline,
	portal: 'z-100',
	cursor: 'cursor-help *:cursor-help',
	content,
	surface: {
		default: popover,
		glass: [glass, ring.default],
	},
	motion: tooltip,
} as const
