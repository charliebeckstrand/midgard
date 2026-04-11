import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.kbd

export const kbdVariants = cva(k.base, {
	variants: { size: k.size },
	defaultVariants: { size: 'md' },
})

export type KbdVariants = VariantProps<typeof kbdVariants>
