import { kage } from '../kage'
import { mode } from './define-colors'

export const avatar = mode('bg-zinc-600', 'dark:bg-zinc-700')

export const switchTrack = [mode('bg-zinc-200', 'dark:bg-white/10'), kage.ringInset]

export const switchThumb = mode('bg-white ring-1 ring-zinc-950/5')

export const switchHover = mode(
	'not-disabled:not-checked:hover:bg-zinc-300',
	'dark:not-disabled:not-checked:hover:bg-white/15',
)

export const sidebarLabel = mode(
	'group-data-[current]:text-zinc-950',
	'dark:group-data-[current]:text-white',
)

export const tableStriped = mode('*:odd:bg-zinc-950/2.5', 'dark:*:odd:bg-white/2.5')

export const tabIndicator = mode('bg-zinc-950', 'dark:bg-white')
