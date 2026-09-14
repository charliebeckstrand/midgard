import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableHead}: native `<thead>` attributes. */
export type TableHeadProps = ComponentProps<'thead'>

/**
 * The `<thead>` of a {@link Table}, grouping its header row(s). Static leaf:
 * renders in React Server Components.
 */
export const TableHead = createSlot('thead', 'table-head', k.head)
