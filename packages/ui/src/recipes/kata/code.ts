import { tv, type VariantProps } from 'tailwind-variants'
import { ji } from '../ji'
import { maru } from '../maru'
import { take } from '../take'

const blockBg = 'bg-[#0d1117]'

export const code = tv({
	base: [...take.mark.base],
	variants: {
		size: take.mark.size,
	},
	defaultVariants: { size: 'md' },
})

export const codeBlock = tv({
	base: ['relative overflow-hidden', maru.rounded.lg, blockBg],
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
		content: '[&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:text-sm/5',
		contentCopy: '[&_pre]:pr-14',
		fallback: ['overflow-x-auto', 'p-4', ji.size.sm, 'text-zinc-400'],
		fallbackCopy: 'pr-14',
		copyButton: ['text-zinc-400 hover:not-disabled:text-white', 'p-2 m-2'],
		copyButtonWrapper: ['absolute top-0 right-0 z-10', blockBg],
	},
}

export type CodeVariants = VariantProps<typeof code>
export type CodeBlockVariants = VariantProps<typeof codeBlock>
