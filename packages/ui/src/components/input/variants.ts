import { cva, type VariantProps } from 'class-variance-authority'
import { omote } from '../../recipes'

export const inputVariants = cva(omote.formInput)

export const inputDateVariants = cva(omote.date)

export type InputVariants = VariantProps<typeof inputVariants>
