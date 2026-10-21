import { defineKata, defineRecipe } from '../../core/recipe'
import { hannou, iro, narabi } from '../kiso'
import { popover } from '../kiso/popover'
import { trigger } from '../kumi/control'

export { scale } from '../kumi/control'

const { cursor } = hannou
const { text } = iro
const { flex } = narabi
const { list } = popover

export const k = defineKata(
	{
		extends: trigger,
		slots: {
			/** The button that opens the list. */
			field: { base: [flex.row, 'text-start', 'appearance-none', ...cursor] },
			options: { base: list.options },
			panel: { base: 'relative min-w-full' },
		},
	},
	{
		value: defineRecipe({
			truncate: {
				// `block`, because a truncation tooltip stamps `inline-flex` on the span, and an
				// ellipsis paints against a block box. A flex item is a block box anyway.
				true: 'block flex-1 min-w-0 truncate',
				false: '',
			},
			defaults: { truncate: true },
		}),
		portal: list.portal,
		placeholder: text.muted,
	},
)
