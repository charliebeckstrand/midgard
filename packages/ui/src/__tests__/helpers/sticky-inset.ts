/**
 * The sticky offset of a cell on one inline edge, as the cell resolves it. A
 * frozen cell reads its offset from a CSS variable on the `<table>`, so the
 * value comes from there. A cell that sets a plain value, or no value, returns
 * that value, or `''`.
 */
export function stickyInset(cell: HTMLElement | null | undefined, edge: 'start' | 'end'): string {
	const value = edge === 'start' ? cell?.style.insetInlineStart : cell?.style.insetInlineEnd

	const name = value?.match(/^var\((--[\w-]+)\)$/)?.[1]

	if (!name) return value ?? ''

	return cell?.closest('table')?.style.getPropertyValue(name) ?? ''
}
