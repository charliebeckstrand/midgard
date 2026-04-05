import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.select

export const selectVariants = cva(k.base)

export type SelectVariants = VariantProps<typeof selectVariants>
