import { cva } from 'class-variance-authority'
import { sawari, sumi } from '../../recipes'

export const sidebarVariants = cva('flex h-full flex-col gap-y-4 overflow-y-auto p-4')

export const sidebarItemVariants = cva([
	...sawari.navItem,
	'group relative flex w-full items-center gap-3 rounded-lg px-2 py-2',
	'text-left font-medium cursor-default',
])

export const sidebarSectionVariants = cva('flex flex-col gap-0.5')

export const sidebarLabelVariants = cva([
	sumi.muted,
	'truncate',
	'group-data-[current]:text-zinc-950 dark:group-data-[current]:text-white',
])

export const sidebarHeaderVariants = cva('flex items-center gap-2')

export const sidebarBodyVariants = cva('flex flex-1 flex-col gap-4 overflow-y-auto')

export const sidebarFooterVariants = cva('mt-auto sticky bottom-0 flex flex-col gap-0.5')
