import type { ContextMenuEntry } from 'ui/context-menu'
import { describe, expect, it, vi } from 'vitest'
import { placeMenuItems, visitMenuItems } from '../../components/place-menu'
import { place } from '../fixtures'

/** The keys of the rows, in order. A separator has a key too. */
const keys = (entries: ContextMenuEntry[]) => entries.map((entry) => entry.key)

describe('placeMenuItems', () => {
	it('lists Add visit, Edit place, and Delete place with no separator', () => {
		const actions = { onAddVisit: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() }

		expect(keys(placeMenuItems(place('a'), actions))).toEqual(['visit', 'edit', 'delete'])
	})
})

describe('visitMenuItems', () => {
	it('offers Delete visit on the only visit of a place', () => {
		const only = place('a')
		const [visit] = only.visits
		const actions = { onEditVisit: vi.fn(), onDeleteVisit: vi.fn() }

		if (visit === undefined) throw new Error('The fixture has a visit.')

		const entries = visitMenuItems(only, visit, actions)

		expect(keys(entries)).toEqual(['edit', 'delete'])

		const remove = entries[1]

		if (remove !== undefined && 'onAction' in remove) remove.onAction?.()

		expect(actions.onDeleteVisit).toHaveBeenCalledWith(only, visit)
	})
})
