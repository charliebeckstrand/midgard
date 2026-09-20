import type { ComponentProps } from 'react'
import { createSlot } from '../../core'

/** Props for {@link TableBody}: native `<tbody>` attributes. */
export type TableBodyProps = ComponentProps<'tbody'>

/**
 * The `<tbody>` of a {@link Table}, grouping its data rows. Static leaf:
 * renders in React Server Components. Striping comes from the parent
 * `<Table striped>` projection.
 */
export const TableBody = createSlot('tbody', 'table-body')
