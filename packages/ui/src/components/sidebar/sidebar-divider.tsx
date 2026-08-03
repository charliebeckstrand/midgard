import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/sidebar'

/** Props for {@link SidebarDivider} (`<hr>` attributes). */
export type SidebarDividerProps = SlotProps<'hr'>

/** Horizontal rule separating groups of items within a `Sidebar`. */
export const SidebarDivider = createSlot('hr', 'sidebar-divider', k.divider)
