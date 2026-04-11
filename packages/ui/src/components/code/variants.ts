import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.code

export const codeVariants = cva(k.inline)

export type CodeVariants = VariantProps<typeof codeVariants>

export const codeBlockVariants = cva(k.block.base)

export type CodeBlockVariants = VariantProps<typeof codeBlockVariants>
