import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableCaption}: native `<caption>` attributes. */
export type TableCaptionProps = ComponentProps<'caption'>

/**
 * The `<caption>` of a {@link Table}, which names the table. Static leaf:
 * renders in React Server Components. Put it as the first child of the
 * `<Table>`.
 *
 * @remarks
 * The caption names the `<table>`. While the table overflows, the scroll
 * container is a region, and it takes its name from the caption too: from the
 * `id` of the caption, else from its text when the text is a string. An
 * `aria-label` or `aria-labelledby` in the `tableProps` of the Table wins.
 */
export const TableCaption = createSlot('caption', 'table-caption', k.caption)
