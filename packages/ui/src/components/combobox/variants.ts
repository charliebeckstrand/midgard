import { cva } from 'class-variance-authority'
import { form } from '../../primitives/form'
import { maru, sawari } from '../../recipes'

export const comboboxInputVariants = cva([...form.inputBase, maru.rounded, 'py-1.5 pr-8 pl-3'])

export const comboboxChevronVariants = cva('absolute inset-y-0 right-0 flex items-center pr-2')

export const comboboxOptionsVariants = cva('max-h-60')

export const comboboxOptionVariants = cva(sawari.option)
