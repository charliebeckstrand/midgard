import { cva, type VariantProps } from 'class-variance-authority'
import { colorCva } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.radio

export const radioColorVariants = colorCva('', k.color)

export const radioVariants = cva(k.base)

export const radioInputVariants = cva(k.input)

export type RadioVariants = VariantProps<typeof radioColorVariants>
