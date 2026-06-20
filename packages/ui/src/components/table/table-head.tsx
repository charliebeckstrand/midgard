import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableHead}: native `<thead>` attributes. */
export type TableHeadProps = SlotProps<'thead'>

/**
 * The `<thead>` of a {@link Table}, grouping its header row(s). Static leaf:
 * renders in React Server Components.
 */
export const TableHead = createSlot('thead', 'table-head', k.head)
