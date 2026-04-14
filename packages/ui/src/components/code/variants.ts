import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

export const k = katachi.code

export const codeVariants = cva(k.inline.base, {
	variants: { size: k.inline.size },
	defaultVariants: { size: 'md' },
})

export type CodeVariants = VariantProps<typeof codeVariants>

export const codeBlockVariants = cva(k.block.base, {
	variants: {
		inline: {
			true: k.block.inline,
			false: '',
		},
	},
	defaultVariants: { inline: false },
})

export type CodeBlockVariants = VariantProps<typeof codeBlockVariants>
