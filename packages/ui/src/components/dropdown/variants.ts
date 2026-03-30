import { cva, type VariantProps } from 'class-variance-authority'
import { kage, katachi, narabi, omote, sawari, sumi } from '../../recipes'

export const dropdownMenuVariants = cva(omote.popover)

export const dropdownItemVariants = cva([
	...sawari.item,
	...narabi.item,
	katachi.icon,
	'flex w-full items-center gap-3 px-3.5 sm:px-3',
])

export const dropdownSectionVariants = cva('')

export const dropdownHeadingVariants = cva([
	sumi.usui,
	'px-3.5 pb-1 pt-2 text-xs/5 font-medium sm:px-3',
])

export const dropdownLabelVariants = cva('truncate')

export const dropdownDescriptionVariants = cva([
	sumi.usui,
	'truncate text-sm/5',
	'group-focus/option:text-white',
])

export const dropdownShortcutVariants = cva([
	sumi.usui,
	'ml-auto text-xs tracking-widest',
	'group-focus/option:text-white',
])

export const dropdownSeparatorVariants = cva(['my-1 border-t', kage.usui])

export type DropdownMenuVariants = VariantProps<typeof dropdownMenuVariants>
export type DropdownItemVariants = VariantProps<typeof dropdownItemVariants>
