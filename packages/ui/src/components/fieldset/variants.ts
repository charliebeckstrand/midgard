import { cva } from 'class-variance-authority'
import { narabi, sumi, yasumi } from '../../recipes'

export const fieldsetVariants = cva(['[&>legend+*]:pt-6', yasumi.disabled])

export const legendVariants = cva([sumi.text, 'text-base/6 font-semibold', yasumi.disabled])

export const fieldVariants = cva([...narabi.field, yasumi.disabled])

export const labelVariants = cva([sumi.text, 'text-base/6 select-none', yasumi.disabled])

export const descriptionVariants = cva([sumi.mutedText, 'text-base/6', yasumi.disabled])

export const errorVariants = cva([sumi.errorText, 'text-base/6', yasumi.disabled])
