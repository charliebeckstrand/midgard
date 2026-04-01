import { cva, type VariantProps } from 'class-variance-authority'
import { form } from '../../primitives/form'

export const inputVariants = cva(form.formInput)

export const inputDateVariants = cva(form.date)

export type InputVariants = VariantProps<typeof inputVariants>
