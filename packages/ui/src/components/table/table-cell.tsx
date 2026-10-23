import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableCell}: native `<td>` attributes, including a `ref` to the cell. */
export type TableCellProps = ComponentProps<'td'>

/**
 * A data cell (`<td>`) within a {@link TableRow}. Static leaf: renders in
 * React Server Components. Its padding takes the step of the nearest density
 * scope, such as `<Table size>`. `outline` overrides it through the table's
 * projection.
 *
 * @remarks Forwards `ref` to the underlying `<td>`, so a client caller can make
 * the cell a drag node (e.g. the data table's reorderable columns).
 */
export const TableCell = createSlot('td', 'table-cell', k().cell)
