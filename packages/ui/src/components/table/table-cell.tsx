import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableCell}: native `<td>` attributes. */
export type TableCellProps = SlotProps<'td'>

/**
 * A data cell (`<td>`) within a {@link TableRow}. Static leaf: renders in
 * React Server Components. Carries md padding; `<Table density>` and `grid`
 * override it through the table's projection.
 */
export const TableCell = createSlot('td', 'table-cell', k.cell())
