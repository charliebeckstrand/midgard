import { cva } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.fieldset

export const fieldsetVariants = cva(k.base)

export const legendVariants = cva(k.legend)

export const fieldVariants = cva(k.field)

export const labelVariants = cva(k.label)

export const descriptionVariants = cva(k.description)

export const errorVariants = cva(k.error)
