import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, narabi } from '../kiso'

const { cursor, disabled } = hannou
const { text } = iro
const { size, weight } = ji
const { field } = narabi

const label = defineRecipe({
	base: [
		'select-none',
		cursor,
		'[[data-slot=field][data-disabled]_&]:cursor-not-allowed',
		'[[data-slot=control][data-disabled]_&]:cursor-not-allowed',
		text.default,
		disabled,
	],
	size: {
		sm: size.sm,
		md: size.md,
		lg: size.lg,
	},
	defaults: { size: 'md' },
})

const description = defineRecipe({
	base: [text.muted, disabled],
	size: {
		sm: size.sm,
		md: size.md,
		lg: size.lg,
	},
	defaults: { size: 'md' },
})

const message = defineRecipe({
	base: [disabled],
	size: {
		sm: size.sm,
		md: size.md,
		lg: size.lg,
	},
	variant: {
		error: text.error,
		success: text.success,
	},
	defaults: { size: 'md', variant: 'error' },
})

const legend = defineRecipe({
	base: [weight.semibold, text.default, disabled],
	size: {
		sm: size.sm,
		md: size.md,
		lg: size.lg,
	},
	defaults: { size: 'md' },
})

export const k = {
	base: ['[&>legend+*]:pt-4', disabled],
	legend,
	field: [
		...field,
		...mode(
			'data-disabled:border-zinc-950/20 data-disabled:cursor-not-allowed',
			'dark:data-disabled:border-white/15',
		),
	],
	label,
	description,
	message,
} as const
