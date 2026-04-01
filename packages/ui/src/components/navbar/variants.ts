import { cva } from 'class-variance-authority'
import { sawari, sumi } from '../../recipes'

export const navbarVariants = cva('flex items-center gap-3 px-4 py-2.5')

export const navbarItemVariants = cva([
	...sawari.navItem,
	'group relative flex items-center gap-2 rounded-lg px-2 py-1 text-sm/6 font-medium',
	'cursor-default',
])

export const navbarSectionVariants = cva('flex items-center gap-3')

export const navbarLabelVariants = cva([sumi.muted, 'text-sm/6'])

export const navbarSpacerVariants = cva('flex-1')
