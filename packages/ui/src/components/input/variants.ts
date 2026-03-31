import { cva, type VariantProps } from 'class-variance-authority'
import { katachi, ma, omote } from '../../recipes'

export const inputControlVariants = cva(omote.control)

export const inputVariants = cva([...omote.input, ma.control, katachi.maru])

export const inputDateVariants = cva(omote.date)

export type InputVariants = VariantProps<typeof inputVariants>
