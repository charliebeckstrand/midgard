/**
 * Fieldset kata: object-literal surface for `<Fieldset>` and the form-field
 * primitives. `legend`, `label`, `description`, and `message` take the text
 * step of their nearest density scope through `ji.ramp`; `message` adds an
 * error/warning/success severity axis. The `base` and `field` slots are
 * static, threading the disabled state down through the group.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, narabi } from '../kiso'

const { cursor, disabled } = hannou
const { text } = iro
const { weight } = ji
const { field } = narabi

const label = defineRecipe({
	base: [
		'flex w-fit select-none',
		...cursor,
		'[[data-slot=field][data-disabled]_&]:cursor-not-allowed',
		'[[data-slot=control][data-disabled]_&]:cursor-not-allowed',
		text.default,
		ji.ramp,
		...disabled,
	],
})

const description = defineRecipe({
	base: [text.muted, ji.ramp, ...disabled],
})

const message = defineRecipe({
	base: [ji.ramp, ...disabled],
	severity: {
		error: text.error,
		warning: text.warning,
		success: text.success,
	},
	defaults: { severity: 'error' },
})

const legend = [ji.ramp, weight.semibold, text.default, ...disabled]

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
