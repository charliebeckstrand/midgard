import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/sidebar'

/** Props for {@link SidebarSection} (`<div>` attributes). */
export type SidebarSectionProps = ComponentProps<'div'>

/** Groups related sidebar content (a heading, a `SidebarList`, a divider) into one block. */
export const SidebarSection = createSlot('div', 'sidebar-section', k.section)
