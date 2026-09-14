import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/list'

/** Props for {@link ListDescription}: native `<span>` attributes via the slot factory. */
export type ListDescriptionProps = ComponentProps<'span'>

/** Secondary supporting text for a {@link ListItem}, rendered as a muted `<span>`. */
export const ListDescription = createSlot('span', 'list-description', k.description)
