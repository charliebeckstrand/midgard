/**
 * Fieldset kata: the unit of `<Fieldset>` and the form-field primitives.
 * `legend`, `label`, `description`, and `message` take the text step of their
 * nearest density scope through `dan.text.body`. The `as` axis of `label` gives the
 * element of the label, and the `severity` axis of `message` gives the
 * error/warning/success color. The `base` and `field` slots are static, and
 * they thread the disabled state down through the group.
 */
import { defineKata } from '../../core/recipe'
import { dan, hannou, iro, narabi } from '../kiso'

const { cursor, disabled } = hannou
const { text } = iro
const { field } = narabi

export const k = defineKata({
	base: [dan.space.fieldset.legend, ...disabled.base],
	slots: {
		legend: [dan.text.body, 'font-semibold', text.default, ...disabled.base],
		field: [...field, 'data-disabled:cursor-not-allowed'],
		// A `<label>` takes the press and passes it to its control, so it has the pointer and does not
		// select its text. A `<span>` caption takes no press, so it has neither. The label of a
		// read-only control shows the default cursor, because the press changes nothing. The control
		// is a sibling of the label, so the rule reads the Field. It sits in `:where()` (`in-[…]`), as
		// in `hannou.cursor`, so the disabled rule replaces it.
		label: {
			base: ['flex w-fit', text.default, dan.text.body, ...disabled.base],
			as: {
				label: [
					'select-none',
					...cursor,
					'[:is([data-slot=field],[data-slot=control])[data-disabled]_&]:cursor-not-allowed',
					'in-[[data-slot=field]:has([aria-readonly=true],[data-readonly],[readonly])]:cursor-default',
				],
				span: [],
			},
		},
		description: [text.muted, dan.text.body, ...disabled.base],
		message: {
			base: [dan.text.body, ...disabled.base],
			severity: {
				error: text.error,
				warning: text.warning,
				success: text.success,
			},
		},
	},
	defaults: { as: 'label', severity: 'error' },
})
