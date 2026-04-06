import { cva } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.listbox

export const selectButtonVariants = cva(k.button)

export const selectOptionsVariants = cva(k.options)

export const selectValueVariants = cva(k.value)

export const selectChevronVariants = cva(k.chevron)

export const selectOptionVariants = cva(k.option)
