/**
 * Build `count` stable, React-key-safe strings of the form `${prefix}-${index}`.
 * For fixed-length placeholder loops — skeletons, thumbnail rails — that render
 * `count` items with no domain data to key on.
 *
 * @example
 *   {rangeKeys(rows, 'row').map((key) => <TableRow key={key}>…</TableRow>)}
 */
export function rangeKeys(count: number, prefix: string): string[] {
	return Array.from({ length: count }, (_, index) => `${prefix}-${index}`)
}
