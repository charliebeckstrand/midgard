import { tv, type VariantProps } from 'tailwind-variants'
import { ji } from '../ryu/ji'
import { take } from '../ryu/take'

const blockBg = 'bg-[#0d1117]'

export const code = tv({
	base: [...take.mark.base],
	variants: {
		size: take.mark.size,
	},
	defaultVariants: { size: 'md' },
})

export const codeBlock = tv({
	base: ['relative overflow-hidden', 'rounded-lg', blockBg],
	variants: {
		inline: {
			true: 'w-fit max-w-full',
			false: '',
		},
	},
	defaultVariants: { inline: false },
})

export const slots = {
	block: {
		content: '[&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:text-sm',
		contentCopy: '[&_pre]:pr-14',
		fallback: ['overflow-x-auto', 'p-4', ji.size.sm, 'text-zinc-400'],
		fallbackCopy: 'pr-14',
		copyButton: ['text-zinc-400 hover:not-disabled:text-white', 'p-2.5 m-2'],
		copyButtonWrapper: ['absolute top-0 right-0 z-10', blockBg],
	},
}

export type CodeVariants = VariantProps<typeof code>
export type CodeBlockVariants = VariantProps<typeof codeBlock>
