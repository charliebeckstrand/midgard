import { cva } from 'class-variance-authority'
import { kage, sawari } from '../../recipes'

export const tabGroupVariants = cva('')

export const tabListVariants = cva(['flex gap-4', 'border-b', kage.usui])

export const tabVariants = cva([
	'relative flex items-center gap-2 px-1 py-3 font-medium',
	// Focus — suppress ring, show muted bottom line only
	'outline-none',
	'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full',
	'after:bg-transparent not-data-current:focus-visible:after:bg-blue-500',
	'cursor-default',
	...sawari.tab,
])

export const tabIndicatorVariants = cva(
	'inset-x-0 -bottom-px top-auto h-0.5 rounded-full bg-zinc-950 dark:bg-white',
)

export const tabPanelsVariants = cva('')

export const tabPanelVariants = cva('')
