/**
 * Fieldset kata: object-literal surface for `<Fieldset>` and the form-field
 * primitives. `label`, `description`, and `message` take the text step of
 * their nearest density scope through `textRamp`; `message` adds an
 * error/warning/success severity axis. `legend` holds a fixed size axis. The `base` and `field`
 * slots are static, threading the disabled state down through the group.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, narabi, stepSize, textRamp } from '../kiso'

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
		textRamp,
		...disabled,
	],
})

const description = defineRecipe({
	base: [text.muted, textRamp, ...disabled],
})

const message = defineRecipe({
	base: [textRamp, ...disabled],
	severity: {
		error: text.error,
		warning: text.warning,
		success: text.success,
	},
	defaults: { severity: 'error' },
})

const legend = defineRecipe({
	base: [weight.semibold, text.default, ...disabled],
	size: stepSize,
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
