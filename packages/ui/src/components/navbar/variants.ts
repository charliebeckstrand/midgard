import { cva } from 'class-variance-authority'
import { maru, sawari, sumi } from '../../recipes'

export const navbarVariants = cva('flex items-center gap-3 px-4 py-2.5')

export const navbarItemVariants = cva([
	...sawari.navItem,
	maru.rounded,
	'group relative flex items-center gap-2 px-2 py-1 text-sm/6 font-medium',
	'cursor-default',
])

export const navbarSectionVariants = cva('flex items-center gap-3')

export const navbarLabelVariants = cva([sumi.textMuted, 'text-sm/6'])

export const navbarSpacerVariants = cva('flex-1')
