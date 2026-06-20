import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'

/** Props for {@link TableBody}: native `<tbody>` attributes. */
export type TableBodyProps = SlotProps<'tbody'>

/**
 * The `<tbody>` of a {@link Table}, grouping its data rows. Static leaf:
 * renders in React Server Components. Striping comes from the parent
 * `<Table striped>` projection.
 */
export const TableBody = createSlot('tbody', 'table-body')
