import { cva, type VariantProps } from 'class-variance-authority'
import { kage, sumi } from '../../recipes'

export const descriptionListVariants = cva('grid grid-cols-1 text-sm/6 sm:grid-cols-[min(50%,theme(spacing.80))_auto]')

export const descriptionTermVariants = cva([
	sumi.usui,
	'col-start-1 border-t pt-3',
	kage.usui,
	'sm:py-3',
	'first:border-t-0 first:pt-0 sm:first:py-3',
])

export const descriptionDetailsVariants = cva([
	sumi.base,
	'pb-3 pt-1',
	'sm:border-t sm:py-3',
	kage.usui,
	'sm:[&:nth-child(2)]:border-t-0',
])

export type DescriptionListVariants = VariantProps<typeof descriptionListVariants>
