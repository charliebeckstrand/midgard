import { defineRecipe } from '../../core/recipe'
import { hannou, iro, ji, narabi } from '../kiso'

const label = defineRecipe({
	base: [
		'select-none',
		hannou.cursor,
		'[[data-slot=field][data-disabled]_&]:cursor-not-allowed',
		'[[data-slot=control][data-disabled]_&]:cursor-not-allowed',
		iro.text.default,
		hannou.disabled,
	],
	size: {
		sm: ji.sm,
		md: ji.md,
		lg: ji.lg,
	},
	defaults: { size: 'md' },
})

const description = defineRecipe({
	base: [iro.text.muted, hannou.disabled],
	size: {
		sm: ji.sm,
		md: ji.md,
		lg: ji.lg,
	},
	defaults: { size: 'md' },
})

const message = defineRecipe({
	base: [hannou.disabled],
	size: {
		sm: ji.sm,
		md: ji.md,
		lg: ji.lg,
	},
	variant: {
		error: iro.text.error,
		success: iro.text.success,
	},
	defaults: { size: 'md', variant: 'error' },
})

const legend = defineRecipe({
	base: ['font-semibold', iro.text.default, hannou.disabled],
	size: {
		sm: ji.sm,
		md: ji.md,
		lg: ji.lg,
	},
	defaults: { size: 'md' },
})

export const k = {
	base: ['[&>legend+*]:pt-4', hannou.disabled],
	legend,
	field: [
		...narabi.field,
		'data-disabled:border-zinc-950/20 data-disabled:cursor-not-allowed',
		'dark:data-disabled:border-white/15',
	],
	label,
	description,
	message,
}
