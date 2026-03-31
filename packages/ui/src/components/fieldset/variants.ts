import { cva, type VariantProps } from 'class-variance-authority'
import { narabi, sumi, yasumi } from '../../recipes'

export const fieldsetVariants = cva(['[&>legend+*]:pt-6', yasumi.base])

export const legendVariants = cva([
	sumi.base,
	'text-base/6 font-semibold sm:text-sm/6',
	yasumi.base,
])

export const fieldVariants = cva([...narabi.field, yasumi.base])

export const labelVariants = cva([sumi.base, 'text-base/6 select-none sm:text-sm/6', yasumi.base])

export const descriptionVariants = cva([sumi.usui, 'text-base/6 sm:text-sm/6', yasumi.base])

export const errorVariants = cva([
	'text-red-600 dark:text-red-500',
	'text-base/6 sm:text-sm/6',
	yasumi.base,
])

export type FieldsetVariants = VariantProps<typeof fieldsetVariants>
export type LegendVariants = VariantProps<typeof legendVariants>
export type FieldVariants = VariantProps<typeof fieldVariants>
export type LabelVariants = VariantProps<typeof labelVariants>
export type DescriptionVariants = VariantProps<typeof descriptionVariants>
export type ErrorVariants = VariantProps<typeof errorVariants>
