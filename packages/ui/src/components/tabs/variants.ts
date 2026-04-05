import { cva } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.tabs

export const tabListVariants = cva(k.list)

export const tabVariants = cva(k.tab)

export const tabIndicatorVariants = cva(k.indicator)
