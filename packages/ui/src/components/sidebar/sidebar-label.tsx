import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/sidebar'

/** Props for {@link SidebarLabel} (`<span>` attributes). */
export type SidebarLabelProps = ComponentProps<'span'>

/**
 * Text label of a `SidebarItem`. Under the mini rail it is hidden in place
 * (keeping the accessible name) and echoed into the item's hover tooltip.
 */
export const SidebarLabel = createSlot('span', 'sidebar-label', k.label)
