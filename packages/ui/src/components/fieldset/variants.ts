import { cva } from 'class-variance-authority'
import { narabi, sumi, yasumi } from '../../recipes'

export const fieldsetVariants = cva(['[&>legend+*]:pt-6', yasumi.base])

export const legendVariants = cva([sumi.base, 'text-base/6 font-semibold', yasumi.base])

export const fieldVariants = cva([...narabi.field, yasumi.base])

export const labelVariants = cva([sumi.base, 'text-base/6 select-none', yasumi.base])

export const descriptionVariants = cva([sumi.muted, 'text-base/6', yasumi.base])

export const errorVariants = cva([sumi.error, 'text-base/6', yasumi.base])
