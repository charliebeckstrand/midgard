import { cva } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.sidebar

export const sidebarVariants = cva(k.root)

export const sidebarItemVariants = cva(k.item)

export const sidebarSectionVariants = cva(k.section)

export const sidebarLabelVariants = cva(k.label)

export const sidebarHeaderVariants = cva(k.header)

export const sidebarBodyVariants = cva(k.body)

export const sidebarDividerVariants = cva(k.divider)

export const sidebarFooterVariants = cva(k.footer)
