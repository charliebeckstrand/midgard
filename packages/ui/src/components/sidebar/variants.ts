import { cva } from 'class-variance-authority'
import { katachi, ki, sawari, sumi } from '../../recipes'

export const sidebarVariants = cva('flex h-full flex-col gap-y-4 overflow-y-auto px-2 py-4')

export const sidebarItemVariants = cva([
	'group relative flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm/6 font-medium',
	...sawari.nav,
	ki.reset,
	ki.offset,
	katachi.icon,
	'cursor-default',
])

export const sidebarSectionVariants = cva('flex flex-col gap-0.5')

export const sidebarLabelVariants = cva(['truncate', sumi.usui])

export const sidebarHeaderVariants = cva('flex flex-col gap-2 px-2')

export const sidebarBodyVariants = cva('flex flex-1 flex-col gap-4 overflow-y-auto')

export const sidebarFooterVariants = cva('mt-auto sticky bottom-0 flex flex-col gap-0.5')
