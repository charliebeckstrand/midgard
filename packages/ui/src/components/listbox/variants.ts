import { cva } from 'class-variance-authority'
import { narabi, omote, sawari, sumi } from '../../recipes'

export const listboxButtonVariants = cva([
	'relative block w-full appearance-none rounded-lg py-1.5 pr-8 pl-3',
	'text-left text-base/6',
	sumi.base,
	omote.input,
])

export const listboxOptionsVariants = cva('max-h-60')

export const listboxValueVariants = cva('block truncate')

export const listboxChevronVariants = cva(
	'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2',
)

export const listboxOptionVariants = cva([sawari.item, narabi.item])
