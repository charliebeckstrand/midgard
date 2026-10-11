import type { ContextMenuEntry } from 'ui/context-menu'
import { describe, expect, it, vi } from 'vitest'
import { placeMenuItems, visitMenuItems } from '../../components/place-menu'
import { place } from '../fixtures'

/** The keys of the rows, in order. A separator has a key too. */
const keys = (entries: ContextMenuEntry[]) => entries.map((entry) => entry.key)

/** The actions of the menu of a place, each a mock. */
const placeActions = () => ({
	onAddVisit: vi.fn(),
	onEditVisit: vi.fn(),
	onEdit: vi.fn(),
	onDelete: vi.fn(),
})

describe('placeMenuItems', () => {
	it('lists Add visit, Edit visit, Edit place, and Delete place with no separator', () => {
		expect(keys(placeMenuItems(place('a'), placeActions()))).toEqual([
			'visit',
			'edit-visit',
			'edit',
			'delete',
		])
	})

	it('opens the only visit from Edit visit', () => {
		const only = place('a')
		const actions = placeActions()

		const row = placeMenuItems(only, actions)[1]

		if (row === undefined || !('onAction' in row)) throw new Error('Edit visit is an action.')

		row.onAction?.()

		expect(actions.onEditVisit).toHaveBeenCalledWith(only, only.visits[0])
	})

	it('lists the visits in a submenu, newest first, where there are more', () => {
		const repeat = place('a', {
			visits: [
				{ id: 'new', visitedAt: '2026-10-01', rating: 4, photos: [] },
				{ id: 'old', visitedAt: '2026-01-01', rating: 5, photos: [] },
			],
		})
		const actions = placeActions()

		const row = placeMenuItems(repeat, actions)[1]

		if (row === undefined || !('items' in row)) throw new Error('Edit visit is a submenu.')

		expect(keys(row.items)).toEqual(['new', 'old'])

		const older = row.items[1]

		if (older !== undefined && 'onAction' in older) older.onAction?.()

		expect(actions.onEditVisit).toHaveBeenCalledWith(repeat, repeat.visits[1])
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
