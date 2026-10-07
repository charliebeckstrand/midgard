/**
 * Fieldset kata: object-literal surface for `<Fieldset>` and the form-field
 * primitives. `legend`, `label`, `description`, and `message` take the text
 * step of their nearest density scope through `ji.ramp`; `message` adds an
 * error/warning/success severity axis. The `base` and `field` slots are
 * static, threading the disabled state down through the group.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, narabi } from '../kiso'
import { dan } from '../kiso/dan'

const { cursor, disabled } = hannou
const { text } = iro
const { weight } = ji
const { field } = narabi

// A `<label>` takes the press and passes it to its control, so it has the pointer and does not
// select its text. A `<span>` caption takes no press, so it has neither.
const label = defineRecipe({
	base: ['flex w-fit', text.default, ji.ramp, ...disabled],
	as: {
		label: [
			'select-none',
			...cursor,
			'[:is([data-slot=field],[data-slot=control])[data-disabled]_&]:cursor-not-allowed',
		],
		span: [],
	},
	defaults: { as: 'label' },
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
	base: [dan.space.fieldset.legend, ...disabled],
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
