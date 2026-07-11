import type { ReactNode } from 'react'

/**
 * A column's display label: its `title` when a plain string, else its `id`
 * stringified. Used wherever a column needs a textual name — header titles,
 * filter and export labels, and `aria-label`s — so the fallback stays uniform.
 *
 * @internal
 */
export function columnLabel(column: { id: string | number; title?: ReactNode }): string {
	return typeof column.title === 'string' ? column.title : String(column.id)
}
