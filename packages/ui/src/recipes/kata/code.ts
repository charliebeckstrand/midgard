import { defineRecipe, type VariantProps } from '../../core/recipe'
import { ji, kasane, shaku } from '../kiso'

const { size } = ji
const { radius } = kasane
const { mark } = shaku

const bg = 'bg-[#0d1117]'

const block = defineRecipe({
	base: ['relative overflow-hidden', radius.rounded.lg, bg],
	inline: {
		true: 'w-fit max-w-full',
		false: '',
	},
	defaults: { inline: false },
})

export const k = defineRecipe(
	{
		base: [...mark.base],
		size: mark.size,
		defaults: { size: 'md' },
	},
	{
		codeBlock: block,
		/** Block-specific slot classes; consumed by `CodeBlock`. */
		block: {
			content: '[&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:text-sm',
			contentCopy: '[&_pre]:pr-14',
			fallback: ['overflow-x-auto', 'p-4', size.sm, 'text-zinc-400'],
			fallbackCopy: 'pr-14',
			copyButton: ['text-zinc-400 hover:not-disabled:text-white', 'p-2.5 m-2'],
			copyButtonWrapper: ['absolute top-0 right-0 z-10', bg],
		},
	},
)

export type CodeVariants = VariantProps<typeof k>
export type CodeBlockVariants = VariantProps<typeof block>
