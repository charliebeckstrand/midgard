import { cva } from 'class-variance-authority'
import { kage, sawari, sumi, take } from '../../recipes'

export const dropdownMenuVariants = cva('w-max min-w-48 max-h-60')

export const dropdownItemVariants = cva([
	'group/option flex w-full items-center gap-3 px-3.5 py-2.5 sm:px-3 sm:py-1.5',
	sawari.option,
	take.icon,
])

export const dropdownSectionVariants = cva('first:pt-0 last:pb-0')

export const dropdownHeadingVariants = cva([
	sumi.muted,
	'px-3.5 pb-1 pt-2 text-xs/5 font-medium sm:px-3',
])

export const dropdownLabelVariants = cva('truncate')

export const dropdownDescriptionVariants = cva([
	sumi.muted,
	'flex flex-1 overflow-hidden before:w-2 before:min-w-0 before:shrink',
	'group-focus/option:text-white',
])

export const dropdownShortcutVariants = cva([
	sumi.muted,
	'ml-auto pl-4 text-xs/5',
	'group-focus/option:text-white/70',
])

export const dropdownSeparatorVariants = cva([...kage.separator, 'my-1'])
