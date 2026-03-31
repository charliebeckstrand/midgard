import { cva, type VariantProps } from 'class-variance-authority'
import { kage, sumi } from '../../recipes'

export const descriptionListVariants = cva(
	'grid grid-cols-1 text-sm/6 sm:grid-cols-[min(50%,--spacing(56))_auto]',
)

export const descriptionTermVariants = cva([
	sumi.usui,
	'col-start-1 border-t pt-3',
	kage.usui,
	'sm:py-3',
	'font-medium',
])

export const descriptionDetailsVariants = cva([
	sumi.base,
	'pb-3 pt-1',
	'sm:border-t sm:py-3',
	kage.usui,
	'sm:nth-2:border-none',
])

export type DescriptionListVariants = VariantProps<typeof descriptionListVariants>
