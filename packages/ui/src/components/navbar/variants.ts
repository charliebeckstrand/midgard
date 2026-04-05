import { cva } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.navbar

export const navbarVariants = cva(k.base)

export const navbarItemVariants = cva(k.item)

export const navbarSectionVariants = cva(k.section)

export const navbarLabelVariants = cva(k.label)

export const navbarSpacerVariants = cva(k.spacer)
