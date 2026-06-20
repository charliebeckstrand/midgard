import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/sidebar'

export type SidebarLabelProps = SlotProps<'span'>

/**
 * Text label of a `SidebarItem`. Under the mini rail it is hidden in place
 * (keeping the accessible name) and echoed into the item's hover tooltip.
 */
export const SidebarLabel = createSlot('span', 'sidebar-label', k.label)
