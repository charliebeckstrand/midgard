import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/sidebar'

/** Props for {@link SidebarDivider} (`<hr>` attributes). */
export type SidebarDividerProps = ComponentProps<'hr'>

/** Horizontal rule separating groups of items within a `Sidebar`. */
export const SidebarDivider = createSlot('hr', 'sidebar-divider', k.divider)
