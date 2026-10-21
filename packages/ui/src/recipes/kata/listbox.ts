import { defineRecipe } from '../../core/recipe'
import { iro, narabi } from '../kiso'
import { control } from '../kiso/control'
import { popover } from '../kiso/popover'

const { text } = iro
const { flex } = narabi
const { list } = popover

export const k = defineRecipe(
	{
		base: [flex.row, ...control.button],
		slots: {
			options: list.options,
			panel: 'relative min-w-full',
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

/** The size scale of the control: each step from `xs` to `xl`. */
export const scale = control.scale
