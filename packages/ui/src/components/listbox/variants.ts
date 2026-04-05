import { cva } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.listbox

export const listboxButtonVariants = cva(k.button)

export const listboxOptionsVariants = cva(k.options)

export const listboxValueVariants = cva(k.value)

export const listboxChevronVariants = cva(k.chevron)

export const listboxOptionVariants = cva(k.option)
