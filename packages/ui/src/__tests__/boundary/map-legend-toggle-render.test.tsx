import { describe, expect, it, vi } from 'vitest'
import { LegendSwitch } from '../../modules/chart/engine/chart-legend/legend-switch'
import { act, allBySlot, fireEvent, renderUI } from '../helpers'
import { categoricalPlat } from '../helpers/map-plat'

/**
 * A legend toggle renders the one entry that it changes.
 *
 * Each legend entry is memoized and takes the toggle handler of the plat. The
 * handler reads the hidden set, so it had a new identity after each toggle, and
 * one toggle rendered every entry of the legend.
 *
 * The count reads the `LegendSwitch` that each entry renders. It needs a module
 * mock, so this suite sits in `boundary/`.
 */
vi.mock('../../modules/chart/engine/chart-legend/legend-switch', async (importActual) => {
	const actual =
		await importActual<typeof import('../../modules/chart/engine/chart-legend/legend-switch')>()

	return { ...actual, LegendSwitch: vi.fn(actual.LegendSwitch) }
})

/** One row for each region of the fixture, each in a category of its own. */
const ROWS = [
	{ state: 'A', zone: 'East' },
	{ state: 'B', zone: 'West' },
	{ state: 'C', zone: 'North' },
]

/** Clicks the legend entry at `position`, and returns the labels of the entries that rendered. */
function toggleEntry(container: HTMLElement, position: number) {
	const entry = allBySlot(container, 'map-legend-item')[position] as HTMLElement

	vi.mocked(LegendSwitch).mockClear()

	act(() => {
		fireEvent.click(entry)
	})

	return vi.mocked(LegendSwitch).mock.calls.map(([props]) => props.label)
}

describe('map legend toggle renders', () => {
	it('renders only the entry that a toggle changes', () => {
		const { container } = renderUI(categoricalPlat({ data: ROWS }))

		// Each entry rendered at the mount, so a short count below can fail.
		expect(vi.mocked(LegendSwitch).mock.calls.map(([props]) => props.label)).toEqual(
			expect.arrayContaining(['East', 'West', 'North']),
		)

		expect(toggleEntry(container, 1)).toEqual(['West'])

		expect(allBySlot(container, 'map-legend-item')[1]).toHaveAttribute('aria-pressed', 'false')

		// The second toggle reads the hidden set of the first, through the same
		// handler, and shows the entry again.
		expect(toggleEntry(container, 1)).toEqual(['West'])

		expect(allBySlot(container, 'map-legend-item')[1]).toHaveAttribute('aria-pressed', 'true')

		expect(toggleEntry(container, 0)).toEqual(['East'])
	})
})
