import { cn, createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/menu'
import { Kbd, type KbdProps } from '../kbd'

export type MenuSectionProps = SlotProps<'fieldset'>

export const MenuSection = createSlot('fieldset', 'menu-section', k.section)

export type MenuHeadingProps = SlotProps<'legend'>

export const MenuHeading = createSlot('legend', 'menu-heading', k.heading)

export type MenuSeparatorProps = SlotProps<'hr'>

export const MenuSeparator = createSlot('hr', 'menu-separator', k.separator)

export type MenuLabelProps = SlotProps<'span'>

export const MenuLabel = createSlot('span', 'menu-label', k.label)

export type MenuDescriptionProps = SlotProps<'span'>

export const MenuDescription = createSlot('span', 'menu-description', k.description)

export type MenuShortcutProps = KbdProps

export function MenuShortcut({ className, ...props }: MenuShortcutProps) {
	return <Kbd data-slot="menu-shortcut" className={cn(k.shortcut, className)} {...props} />
}
