import { cva } from 'class-variance-authority'
import { kage, katachi, narabi, omote, sawari, sumi } from '../../recipes'

export const dropdownMenuVariants = cva([omote.popover, 'max-h-60'])

export const dropdownItemVariants = cva([
	'group/option flex w-full items-center gap-3 px-3.5 py-2.5 sm:px-3 sm:py-1.5',
	sawari.item,
	narabi.item,
	katachi.icon,
])

export const dropdownSectionVariants = cva('first:pt-0 last:pb-0')

export const dropdownHeadingVariants = cva([
	sumi.usui,
	'px-3.5 pb-1 pt-2 text-xs/5 font-medium sm:px-3',
])

export const dropdownLabelVariants = cva('truncate')

export const dropdownDescriptionVariants = cva([
	'flex flex-1 overflow-hidden text-zinc-500 before:w-2 before:min-w-0 before:shrink',
	'group-focus/option:text-white',
	'dark:text-zinc-400',
])

export const dropdownShortcutVariants = cva([
	'ml-auto pl-4 text-xs/5 text-zinc-400',
	'group-focus/option:text-white/70',
	'dark:text-zinc-500',
])

export const dropdownSeparatorVariants = cva(['my-1 border-t', kage.usui])
