import { cva, type VariantProps } from 'class-variance-authority'
import { colorCva } from '../../core'
import { katachi } from '../../recipes'

export const k = katachi.checkbox

export const checkboxColorVariants = colorCva('', k.color)

export const checkboxVariants = cva(k.base)

export const checkboxInputVariants = cva(k.input)

export type CheckboxVariants = VariantProps<typeof checkboxColorVariants>
