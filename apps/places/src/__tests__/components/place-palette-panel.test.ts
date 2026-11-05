import type { ContextMenuEntry } from 'ui/context-menu'
import { describe, expect, it, vi } from 'vitest'
import { closingEntries } from '../../components/place-palette/place-palette-panel'

/** Runs the action of the row at `path`, through each submenu on the way. */
function choose(entries: ContextMenuEntry[], path: readonly number[]) {
	const [at = 0, ...rest] = path

	const entry = entries[at]

	if (entry === undefined) throw new Error(`No row at ${at}`)

	if ('items' in entry) return choose(entry.items, rest)

	if ('onAction' in entry) return entry.onAction?.()

	throw new Error(`The row at ${at} has no action`)
}

describe('closingEntries', () => {
	it('closes the palette before a row acts', () => {
		const calls: string[] = []

		const entries = closingEntries(
			[{ label: 'Edit place', onAction: () => calls.push('edit') }],
			() => calls.push('close'),
		)

		choose(entries, [0])

		expect(calls).toEqual(['close', 'edit'])
	})

	// Edit visit of a place with more than one visit is a submenu of the days.
	// The day opens the form, which the open palette would cover.
	it('closes the palette before a row of a submenu acts', () => {
		const close = vi.fn()

		const editVisit = vi.fn()

		const entries = closingEntries(
			[
				{
					label: 'Edit visit',
					items: [
						{ label: 'Aug 15, 2026', onAction: editVisit },
						{ label: 'Aug 16, 2026', onAction: editVisit },
					],
				},
			],
			close,
		)

		choose(entries, [0, 1])

		expect(close).toHaveBeenCalledOnce()

		expect(editVisit).toHaveBeenCalledOnce()
	})
})
