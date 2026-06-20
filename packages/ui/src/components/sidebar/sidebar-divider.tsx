import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/sidebar'

export type SidebarDividerProps = SlotProps<'hr'>

/** Horizontal rule separating groups of items within a `Sidebar`. */
export const SidebarDivider = createSlot('hr', 'sidebar-divider', k.divider)
