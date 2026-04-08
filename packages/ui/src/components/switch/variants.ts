import { cva, type VariantProps } from 'class-variance-authority'
import { colorCva } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.switch

export const switchColorVariants = colorCva('', k.color)

export const switchVariants = cva(k.base)

export const switchInputVariants = cva(k.input)

export const switchThumbVariants = cva(k.thumb)

export type SwitchVariants = VariantProps<typeof switchColorVariants>
