import { defineRecipe, type VariantProps } from '../../core/recipe'
import { ji, kasane, omote, shaku } from '../kiso'

const { size } = ji
const { rounded } = kasane
const { mark } = shaku

const bg = omote.bg.code

export const k = defineRecipe(
	{
		base: mark.base,
		size: mark.size,
		defaults: { size: 'md' },
	},
	{
		wrapper: ['overflow-hidden flex items-start gap-4 p-4', rounded.lg, bg],
		/** Block-specific slot classes; consumed by `CodeBlock`. */
		block: {
			content: ['min-w-0 flex-1 overflow-x-auto', size.sm],
			fallback: 'text-zinc-400',
		},
		// Sits in the flex row, not absolutely positioned: `items-start` lands it on
		// the first code line. The sm icon-only button (24px) overhangs the 20px
		// text-sm line by 2px each side; `-my-0.5` cancels the overhang so the row
		// stays one line tall, the glyph centres on the first code line, and a
		// single-line block reads as vertically centred.
		copy: ['-my-0.5', 'text-zinc-400', 'hover:not-disabled:text-white'],
	},
)

export type CodeVariants = VariantProps<typeof k>
export type CodeBlockVariants = VariantProps<typeof k>
