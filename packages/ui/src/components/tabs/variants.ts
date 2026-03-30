import { cva } from 'class-variance-authority'
import { kage, ki, sawari } from '../../recipes'

export const tabGroupVariants = cva('')

export const tabListVariants = cva(['flex gap-4', 'border-b', kage.usui])

export const tabVariants = cva([
	'relative flex items-center gap-2 px-1 py-3 text-sm/6 font-medium',
	ki.reset,
	ki.offset,
	...sawari.tab,
	'cursor-default',
])

export const tabPanelsVariants = cva('')

export const tabPanelVariants = cva('')
