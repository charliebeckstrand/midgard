import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/sidebar'

/** Props for {@link SidebarSection} (`<div>` attributes). */
export type SidebarSectionProps = ComponentProps<'div'>

/**
 * A block that groups related sidebar content (a heading, a `SidebarList`, a
 * divider). When the current item is the first of its list, the section is
 * the initial scroll target, so the heading shows above the item.
 */
export const SidebarSection = createSlot('div', 'sidebar-section', k().section)
