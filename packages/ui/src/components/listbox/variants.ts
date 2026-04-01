import { cva } from 'class-variance-authority'
import { form } from '../../primitives/form'
import { maru, sawari } from '../../recipes'

export const listboxButtonVariants = cva([
	...form.input,
	maru.rounded,
	'appearance-none py-1.5 pr-8 pl-3',
	'text-left text-base/6',
])

export const listboxOptionsVariants = cva('max-h-60')

export const listboxValueVariants = cva('block truncate')

export const listboxChevronVariants = cva(
	'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2',
)

export const listboxOptionVariants = cva(sawari.option)
