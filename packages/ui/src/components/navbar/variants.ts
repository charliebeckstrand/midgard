import { cva } from 'class-variance-authority'
import { katachi, ki, sawari, sumi } from '../../recipes'

export const navbarVariants = cva('flex items-center gap-3')

export const navbarItemVariants = cva([
	'group relative flex items-center gap-2 px-2 py-1 text-sm/6 font-medium',
	...sawari.nav,
	ki.reset,
	ki.offset,
	katachi.icon,
	'cursor-default',
])

export const navbarSectionVariants = cva('flex items-center gap-3')

export const navbarLabelVariants = cva(['text-sm/6', sumi.usui])

export const navbarSpacerVariants = cva('flex-1')
