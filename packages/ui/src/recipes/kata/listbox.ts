import { defineRecipe } from '../../core/recipe'
import { hannou, iro, narabi } from '../kiso'
import { control } from '../kiso/control'
import { popover } from '../kiso/popover'

const { cursor } = hannou
const { text } = iro
const { flex } = narabi
const { reset, density } = control
const { portal, fit } = popover

export const k = defineRecipe(
	{
		base: [
			flex.row,
			'w-full',
			'text-start',
			...reset.base,
			'appearance-none',
			...cursor,
			...density,
		],
		slots: {
			// 320px ≈ 8 rows. The old 240px (the classic Tailwind-example value, never a reasoned one)
			// forced a scrollbar at seven options — the dashboard picker hit it with screen to spare.
			// The cap only binds on lists that exceed it. A panel that no longer fits below its
			// trigger flips above, and a panel that fits on neither side shrinks into the larger
			// space (the floating middleware chain). Kept in step with the combobox recipe: one
			// dropdown family, one height.
			options: ['max-h-80', fit.scroll],
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
		portal: [portal, fit.wrapper],
		placeholder: text.muted,
	},
)

/** The size scale of the control: each step from `xs` to `xl`. */
export const scale = control.scale
