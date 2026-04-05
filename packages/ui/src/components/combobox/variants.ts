import { cva } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.combobox

export const comboboxInputVariants = cva(k.input)

export const comboboxChevronVariants = cva(k.chevron)

export const comboboxOptionsVariants = cva(k.options)

export const comboboxOptionVariants = cva(k.option)
