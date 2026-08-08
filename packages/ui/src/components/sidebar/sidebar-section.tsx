import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/sidebar'

/** Props for {@link SidebarSection} (`<div>` attributes). */
export type SidebarSectionProps = SlotProps<'div'>

/** Groups related sidebar content (a heading, a `SidebarList`, a divider) into one block. */
export const SidebarSection = createSlot('div', 'sidebar-section', k.section)
