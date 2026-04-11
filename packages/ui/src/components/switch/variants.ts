import { cva, type VariantProps } from 'class-variance-authority'
import { colorCva } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.switch

export const switchColorVariants = colorCva('', k.color)

export const switchVariants = cva(k.base, {
	variants: { size: k.size },
	defaultVariants: k.defaults,
})

export const switchInputVariants = cva(k.input)

export const switchThumbVariants = cva(k.thumb)

export const switchFieldVariants = cva(k.field.base, {
	variants: { size: k.field.size },
	defaultVariants: k.defaults,
})

export type SwitchVariants = VariantProps<typeof switchColorVariants> &
	VariantProps<typeof switchVariants>

export type SwitchFieldVariants = VariantProps<typeof switchFieldVariants>
