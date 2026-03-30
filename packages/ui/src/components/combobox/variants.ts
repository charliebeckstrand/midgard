import { cva } from 'class-variance-authority'
import { narabi, omote, sawari, sumi } from '../../recipes'

export const comboboxVariants = cva(omote.control)

export const comboboxInputVariants = cva([
	'w-full rounded-lg border-0 bg-transparent py-1.5 pr-8 pl-3',
	'text-base/6 sm:text-sm/6',
	sumi.base,
	'placeholder:text-zinc-500',
	'focus:outline-hidden',
])

export const comboboxOptionsVariants = cva([omote.popover, 'max-h-60'])

export const comboboxOptionVariants = cva([sawari.item, narabi.item])
