import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/menu'

export type MenuSectionProps = SlotProps<'fieldset'>

export const MenuSection = createSlot('fieldset', 'menu-section', k.section)

export type MenuHeadingProps = SlotProps<'legend'>

export const MenuHeading = createSlot('legend', 'menu-heading', k.heading)

export type MenuSeparatorProps = SlotProps<'hr'>

export const MenuSeparator = createSlot('hr', 'menu-separator', k.separator)
