/**
 * Fieldset kata: object-literal surface for `<Fieldset>` and the form-field
 * primitives. `legend`, `label`, `description`, and `message` take the text
 * step of their nearest density scope through `ji.ramp`; `message` adds an
 * error/warning/success severity axis. The `base` and `field` slots are
 * static, threading the disabled state down through the group.
 */
import { defineKata, mode } from '../../core/recipe'
import { dan, hannou, iro, ji, narabi } from '../kiso'

const { cursor, disabled } = hannou
const { text } = iro
const { weight } = ji
const { field } = narabi

export const k = defineKata({
	base: [dan.space.fieldset.legend, ...disabled],
	slots: {
		legend: [ji.ramp, weight.semibold, text.default, ...disabled],
		field: [
			...field,
			...mode(
				'data-disabled:border-zinc-950/20 data-disabled:cursor-not-allowed',
				'dark:data-disabled:border-white/15',
			),
		],
		// A `<label>` takes the press and passes it to its control, so it has the pointer and does not
		// select its text. A `<span>` caption takes no press, so it has neither.
		label: {
			base: ['flex w-fit', text.default, ji.ramp, ...disabled],
			as: {
				label: [
					'select-none',
					...cursor,
					'[:is([data-slot=field],[data-slot=control])[data-disabled]_&]:cursor-not-allowed',
				],
				span: [],
			},
		},
		description: [text.muted, ji.ramp, ...disabled],
		message: {
			base: [ji.ramp, ...disabled],
			severity: {
				error: text.error,
				warning: text.warning,
				success: text.success,
			},
		},
	},
	defaults: { as: 'label', severity: 'error' },
})
