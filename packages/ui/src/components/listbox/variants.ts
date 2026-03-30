import { cva } from 'class-variance-authority'
import { narabi, omote, sawari, sumi } from '../../recipes'

export const listboxVariants = cva(omote.control)

export const listboxButtonVariants = cva([
	'relative block w-full appearance-none rounded-lg py-1.5 pr-8 pl-3',
	'text-left text-base/6 sm:text-sm/6',
	sumi.base,
	omote.input,
])

export const listboxOptionsVariants = cva([omote.popover, 'max-h-60'])

export const listboxOptionVariants = cva([sawari.item, narabi.item])
