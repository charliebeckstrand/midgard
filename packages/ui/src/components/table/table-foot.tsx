import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableFoot}: native `<tfoot>` attributes. */
export type TableFootProps = ComponentProps<'tfoot'>

/**
 * The `<tfoot>` of a {@link Table}, grouping its summary rows, such as the
 * totals. Static leaf: renders in React Server Components. The `striped` and
 * `hover` projections of the Table read body rows only, so a foot row takes
 * neither.
 */
export const TableFoot = createSlot('tfoot', 'table-foot', k.foot)
