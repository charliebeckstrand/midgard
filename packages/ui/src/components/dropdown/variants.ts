import { cva } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.dropdown

export const dropdownMenuVariants = cva(k.menu)

export const dropdownItemVariants = cva(k.item)

export const dropdownSectionVariants = cva(k.section)

export const dropdownHeadingVariants = cva(k.heading)

export const dropdownLabelVariants = cva(k.label)

export const dropdownDescriptionVariants = cva(k.description)

export const dropdownShortcutVariants = cva(k.shortcut)

export const dropdownSeparatorVariants = cva(k.separator)
