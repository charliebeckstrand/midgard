// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IndexSheet, type IndexSheetProps } from '../../components/index-sheet'
import type { Place } from '../../types'
import { place } from '../fixtures'

afterEach(cleanup)

// jsdom has no `ResizeObserver`, and the panel and the grid measure themselves
// with one.
beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
})

const a = place('a')

const b = place('b')

const c = place('c')

/** Which region holds each place. */
const regionByItem = new Map([
	['a', 'Oregon'],
	['b', 'Washington'],
	['c', 'Washington'],
])

const EMPTY = 'No place matches.'

/** The props of a sheet over `items`, cut to Oregon. */
function props(open: boolean, items: readonly Place[]): IndexSheetProps<Place> {
	return {
		open,
		onOpenChange: vi.fn(),
		title: 'My places',
		items,
		regionByItem,
		region: 'Oregon',
		columns: [{ id: 'name', title: 'Name', value: (item) => item.name, cell: (item) => item.name }],
		sort: undefined,
		searchPlaceholder: 'Search',
		empty: EMPTY,
		onOpen: vi.fn(),
	}
}

/** What the region picker shows. */
const region = () => screen.getByRole('combobox', { name: 'Region' }).textContent

describe('IndexSheet', () => {
	it('opens on the region of the view', () => {
		const { rerender } = render(h(IndexSheet<Place>, props(false, [a, b, c])))

		rerender(h(IndexSheet<Place>, props(true, [a, b, c])))

		expect(region()).toContain('Oregon')
	})

	// The app mounts the sheet open when the reader opens it before the code of
	// the sheet has loaded.
	it('opens on the region of the view when it mounts open', () => {
		render(h(IndexSheet<Place>, props(true, [a, b, c])))

		expect(region()).toContain('Oregon')
	})

	// The last place of the picked region is deleted. Washington is the one
	// region left, so the picker that clears the pick is gone.
	it('lists every row when the picked region holds no row any more', () => {
		const { rerender } = render(h(IndexSheet<Place>, props(false, [a, b, c])))

		rerender(h(IndexSheet<Place>, props(true, [a, b, c])))

		rerender(h(IndexSheet<Place>, props(true, [b, c])))

		expect(screen.queryByText(EMPTY)).toBeNull()
	})
})
