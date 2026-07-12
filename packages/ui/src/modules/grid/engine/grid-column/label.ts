import type { ReactNode } from 'react'

/**
 * A titled item's display label: its `title` when a plain string, else its
 * `id` stringified. Columns and column groups share the shape, so one helper
 * covers header titles, filter and export labels, group-band and manager
 * labels, and `aria-label`s — the fallback stays uniform everywhere.
 *
 * @internal
 */
export function columnLabel(column: { id: string | number; title?: ReactNode }): string {
	return typeof column.title === 'string' ? column.title : String(column.id)
}

/**
 * A group value rendered for display: `—` for an empty value, else its string
 * form. The label fallback the group-header rows and the row manager share.
 *
 * @internal
 */
export function groupValueLabel(value: unknown): string {
	return value == null || value === '' ? '—' : String(value)
}
