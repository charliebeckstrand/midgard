import { defineKata } from '../../core/recipe'
import { iro } from '../kiso'
import { button, list } from '../kumi/control'

export { scale } from '../kumi/control'

const { text } = iro

export const k = defineKata(
	{
		extends: list,
		slots: {
			/** The button that opens the list. */
			field: button,
			/** The text of the selected value. */
			value: {
				truncate: {
					// `block`, because a truncation tooltip stamps `inline-flex` on the span, and an
					// ellipsis paints against a block box. A flex item is a block box anyway.
					true: 'block flex-1 min-w-0 truncate',
					false: '',
				},
			},
		},
		defaults: { truncate: true },
	},
	{ placeholder: text.muted },
)
