import { describe, expect, it, vi } from 'vitest'
import { MapPlat } from '../../modules/map'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'
import { renderNavigable } from '../helpers/map-navigable'

type Row = (typeof FIXTURE_ROWS)[number]

function plat(extra?: Partial<Parameters<typeof MapPlat<Row>>[0]>) {
	const props = {
		'aria-label': 'Zones',
		geography: FIXTURE_GEOJSON,
		data: FIXTURE_ROWS,
		regionKey: 'state',
		categoryKey: 'zone',
		width: 400,
		...extra,
	} as Parameters<typeof MapPlat<Row>>[0]

	return <MapPlat {...props} />
}

/** The tooltip's current text, or `null` while the readout is away. */
function readout(container: HTMLElement): string | null {
	return bySlot(container, 'tooltip-content')?.textContent ?? null
}

describe('MapPlat keyboard navigation', () => {
	it('makes the plot region one tab stop', () => {
		const { plot } = renderNavigable(plat())

		// The stop is the role="img" region itself, never a region path: the SVG
		// is aria-hidden, so a focusable path would be an unreachable stop — and
		// one per region on a county atlas.
		expect(plot).toHaveAttribute('tabindex', '0')

		expect(plot?.querySelector('[tabindex]')).toBeNull()
	})

	it('enters at the first region on the first arrow rather than stepping past it', () => {
		const { container, plot } = renderNavigable(plat())

		expect(readout(container)).toBeNull()

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(readout(container)).toContain('Alpha')
	})

	it('steps between regions by compass direction, holding at the edge', () => {
		const { container, plot } = renderNavigable(plat())

		// The fixture lays Alpha, Beta, and Gamma west to east.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(readout(container)).toContain('Beta')

		fireEvent.keyDown(plot, { key: 'ArrowLeft' })

		expect(readout(container)).toContain('Alpha')

		// West of Alpha is the edge of the geography: the cursor holds rather than
		// wraps round to Gamma.
		fireEvent.keyDown(plot, { key: 'ArrowLeft' })

		expect(readout(container)).toContain('Alpha')
	})

	it('jumps to the ends of the atlas order with Home and End', () => {
		const { container, plot } = renderNavigable(plat())

		fireEvent.keyDown(plot, { key: 'End' })

		// Gamma matches no row, so it reads nothing — the same silence the pointer
		// keeps off data. Stepping back west proves the cursor did land there.
		expect(readout(container)).toBeNull()

		fireEvent.keyDown(plot, { key: 'ArrowLeft' })

		expect(readout(container)).toContain('Beta')

		fireEvent.keyDown(plot, { key: 'Home' })

		expect(readout(container)).toContain('Alpha')
	})

	it('picks the region under the cursor with Enter and with Space', () => {
		const onRegionClick = vi.fn()

		const { plot } = renderNavigable(plat({ onRegionClick }))

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'Enter' })

		// The identity a click reports, so a keyboard pick keys into the caller's
		// rows exactly as a pointer pick does.
		expect(onRegionClick).toHaveBeenCalledWith('A', 0)

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: ' ' })

		expect(onRegionClick).toHaveBeenLastCalledWith('B', 1)
	})

	it('picks nothing before an arrow has placed the cursor', () => {
		const onRegionClick = vi.fn()

		const { plot } = renderNavigable(plat({ onRegionClick }))

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onRegionClick).not.toHaveBeenCalled()
	})

	it('clears the readout on Escape and on leaving the region', () => {
		const { container, plot } = renderNavigable(plat())

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'Escape' })

		expect(readout(container)).toBeNull()

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(readout(container)).toContain('Alpha')

		fireEvent.blur(plot)

		expect(readout(container)).toBeNull()
	})

	it('takes no tab stop when the cursor would have nothing to output', () => {
		const { container } = renderUI(plat({ tooltip: false }))

		expect(bySlot(container, 'map-plot')).not.toHaveAttribute('tabindex')
	})

	it('stays navigable without a readout when the map is still a picker', () => {
		// tooltip={false} with onRegionClick is a supported pairing. Gating the tab
		// stop on the readout alone would leave that picker unreachable by keyboard
		// — the cursor still isolates the region it sits on, so it stays legible.
		const onRegionClick = vi.fn()

		const { container } = renderUI(plat({ tooltip: false, onRegionClick }))

		const plot = bySlot(container, 'map-plot')

		expect(plot).toHaveAttribute('tabindex', '0')

		fireEvent.keyDown(plot as Element, { key: 'ArrowRight' })

		fireEvent.keyDown(plot as Element, { key: 'Enter' })

		expect(onRegionClick).toHaveBeenCalledWith('A', 0)
	})

	it('takes no tab stop before the geography lands', () => {
		const { container, rerender } = renderUI(plat({ geography: null }))

		expect(bySlot(container, 'map-plot')).not.toHaveAttribute('tabindex')

		rerender(plat())

		expect(bySlot(container, 'map-plot')).toHaveAttribute('tabindex', '0')
	})

	it('takes no tab stop on a map with nothing to read out', () => {
		// A backdrop: geography, no rows, no marks. `tooltip` asks for a readout
		// rather than asserting one, and all three channels are silent here — an
		// unmatched region raises no tooltip, takes no emphasis, and fills no table
		// row — so the stop would answer every key with nothing.
		const { container } = renderUI(
			<MapPlat aria-label="Backdrop" geography={FIXTURE_GEOJSON} width={400} />,
		)

		expect(bySlot(container, 'map-plot')).not.toHaveAttribute('tabindex')

		expect(bySlot(container, 'map-table')).toBeNull()
	})

	it('takes no tab stop when the rows match no region the map draws', () => {
		// Rows that join to nothing leave the same silence no rows do, so the gate
		// reads the join rather than the presence of a `data` array.
		const { container } = renderUI(plat({ data: [{ state: 'Z', zone: 'East' }] }))

		expect(bySlot(container, 'map-plot')).not.toHaveAttribute('tabindex')

		expect(bySlot(container, 'map-table')).toBeNull()
	})

	it('keeps the stop while the legend holds every category off', () => {
		// A toggle is transient: it silences the readout for as long as it holds,
		// and to take the tab stop away with it would move focus under the reader.
		const { container } = renderNavigable(plat())

		const toggles = allBySlot(container, 'map-legend-item')

		expect(toggles).toHaveLength(2)

		for (const toggle of toggles) fireEvent.click(toggle)

		expect(bySlot(container, 'map-plot')).toHaveAttribute('tabindex', '0')
	})
})
