/**
 * Fieldset kata: object-literal surface for `<Fieldset>` and the form-field
 * primitives. Size-axed sub-recipes carry `legend`, `label`, and `description`;
 * `message` adds an error/warning/success severity axis. The `base` and `field`
 * slots are static, threading the disabled state down through the group.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, narabi } from '../kiso'

const { cursor, disabled } = hannou
const { text } = iro
const { size, weight } = ji
const { field } = narabi

const label = defineRecipe({
	base: [
		'flex w-fit select-none',
		...cursor,
		'[[data-slot=field][data-disabled]_&]:cursor-not-allowed',
		'[[data-slot=control][data-disabled]_&]:cursor-not-allowed',
		text.default,
		...disabled,
	],
	size: {
		sm: size.sm,
		md: size.md,
		lg: size.lg,
	},
	defaults: { size: 'md' },
})

const description = defineRecipe({
	base: [text.muted, ...disabled],
	size: {
		sm: size.sm,
		md: size.md,
		lg: size.lg,
	},
	defaults: { size: 'md' },
})

const message = defineRecipe({
	base: [...disabled],
	size: {
		sm: size.sm,
		md: size.md,
		lg: size.lg,
	},
	severity: {
		error: text.error,
		warning: text.warning,
		success: text.success,
	},
	defaults: { size: 'md', severity: 'error' },
})

const legend = defineRecipe({
	base: [weight.semibold, text.default, ...disabled],
	size: {
		sm: size.sm,
		md: size.md,
		lg: size.lg,
	},
	defaults: { size: 'md' },
})

export const k = {
	base: ['[&>legend+*]:pt-4', ...disabled],
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
