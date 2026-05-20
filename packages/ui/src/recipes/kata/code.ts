import { defineRecipe, ji, shaku, type VariantPropsOf } from '..'

const blockBg = 'bg-[#0d1117]'

export const k = defineRecipe({
	base: [...shaku.mark.base],
	size: shaku.mark.size,
	defaults: { size: 'md' },
})

export const codeBlock = defineRecipe({
	base: ['relative overflow-hidden', 'rounded-lg', blockBg],
	inline: {
		true: 'w-fit max-w-full',
		false: '',
	},
	defaults: { inline: false },
})

/** Block-specific slot classes; consumed by `CodeBlock`. */
export const block = {
	content: '[&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:text-sm',
	contentCopy: '[&_pre]:pr-14',
	fallback: ['overflow-x-auto', 'p-4', ji.size.sm, 'text-zinc-400'],
	fallbackCopy: 'pr-14',
	copyButton: ['text-zinc-400 hover:not-disabled:text-white', 'p-2.5 m-2'],
	copyButtonWrapper: ['absolute top-0 right-0 z-10', blockBg],
}

export type CodeVariants = VariantPropsOf<typeof k>
export type CodeBlockVariants = VariantPropsOf<typeof codeBlock>
