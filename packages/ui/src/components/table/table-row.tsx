import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableRow}: native `<tr>` attributes. */
export type TableRowProps = SlotProps<'tr'>

/**
 * A table row (`<tr>`) holding {@link TableCell}s or {@link TableHeader}s.
 * Static leaf: renders in React Server Components. A body row picks up zebra
 * striping and the hover wash from the parent `<Table striped>` / `<Table
 * hover>` projections.
 */
export const TableRow = createSlot('tr', 'table-row', k.row)
