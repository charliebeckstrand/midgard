import { describe, expect, it, vi } from 'vitest'
import { Dialog, DialogPanel } from '../../components/dialog'
import { MapPlat } from '../../modules/map'
import {
	act,
	allBySlot,
	bySlot,
	expectAnnouncement,
	fireEvent,
	liveRegion,
	renderUI,
	waitFor,
} from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'
import { renderNavigable } from '../helpers/map-navigable'
import { categoricalPlat } from '../helpers/map-plat'
import { allRegions } from '../helpers/map-queries'

/** The tooltip's current text, or `null` while the readout is away. */
function readout(container: HTMLElement): string | null {
	return bySlot(container, 'tooltip-content')?.textContent ?? null
}

describe('MapPlat keyboard navigation', () => {
	it('makes the plot region one tab stop', () => {
		const { plot } = renderNavigable(categoricalPlat())

		// The stop is the role="img" region itself, never a region path: the SVG
		// is aria-hidden, so a focusable path would be an unreachable stop — and
		// one per region on a county atlas.
		expect(plot).toHaveAttribute('tabindex', '0')

		expect(plot?.querySelector('[tabindex]')).toBeNull()
	})

	it('enters at the first region on the first arrow rather than stepping past it', () => {
		const { container, plot } = renderNavigable(categoricalPlat())

		expect(readout(container)).toBeNull()

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(readout(container)).toContain('Alpha')
	})

	it('steps between regions by compass direction, holding at the edge', () => {
		const { container, plot } = renderNavigable(categoricalPlat())

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
		const { container, plot } = renderNavigable(categoricalPlat())

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

		const { plot } = renderNavigable(categoricalPlat({ onRegionClick }))

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

		const { plot } = renderNavigable(categoricalPlat({ onRegionClick }))

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onRegionClick).not.toHaveBeenCalled()
	})

	it('clears the readout on Escape and on leaving the region', () => {
		const { container, plot } = renderNavigable(categoricalPlat())

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'Escape' })

		expect(readout(container)).toBeNull()

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(readout(container)).toContain('Alpha')

		fireEvent.blur(plot)

		expect(readout(container)).toBeNull()
	})

	it('claims Escape only when it clears a readout, so an overlay around it can close', () => {
		const { plot } = renderNavigable(categoricalPlat())

		// `fireEvent` returns false for a press that a handler claimed with `preventDefault`.
		expect(fireEvent.keyDown(plot, { key: 'Escape' })).toBe(true)

		plot.focus()

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(fireEvent.keyDown(plot, { key: 'Escape' })).toBe(false)

		expect(document.activeElement).not.toBe(plot)
	})

	it('claims Escape when it clears a readout that the pointer holds', () => {
		const { container, plot } = renderNavigable(categoricalPlat())

		const [alpha] = allRegions(container)

		fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 })

		expect(readout(container)).toContain('Alpha')

		plot.focus()

		expect(fireEvent.keyDown(plot, { key: 'Escape' })).toBe(false)

		expect(readout(container)).toBeNull()
	})

	it('lets the first Escape close a dialog around a focused map with nothing to clear', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Dialog open onOpenChange={onOpenChange}>
				<DialogPanel>{categoricalPlat()}</DialogPanel>
			</Dialog>,
		)

		const plot = bySlot(document.body, 'map-plot')

		if (plot === null) throw new Error('the dialog drew no plot region')

		plot.focus()

		fireEvent.keyDown(plot, { key: 'Escape' })

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('speaks the readout of each region that an arrow key moves the cursor onto', async () => {
		const { plot } = renderNavigable(categoricalPlat())

		// The tooltip is `aria-hidden`, so the live region carries the readout.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await expectAnnouncement('Alpha, East')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await expectAnnouncement('Beta, West')

		expect(liveRegion()).toHaveAttribute('aria-atomic', 'true')
	})

	it('speaks nothing for a stop with no readout', async () => {
		const { plot } = renderNavigable(categoricalPlat())

		// Gamma matches no row, so the tooltip stays away and the cursor is silent.
		fireEvent.keyDown(plot, { key: 'End' })

		await act(async () => {})

		expect(liveRegion()?.textContent ?? '').toBe('')
	})

	it('takes no tab stop when the cursor would have nothing to output', () => {
		const { container } = renderUI(categoricalPlat({ tooltip: false }))

		expect(bySlot(container, 'map-plot')).not.toHaveAttribute('tabindex')
	})

	it('stays navigable without a readout when the map is still a picker', () => {
		// tooltip={false} with onRegionClick is a supported pairing. Gating the tab
		// stop on the readout alone would leave that picker unreachable by keyboard
		// — the cursor still isolates the region it sits on, so it stays legible.
		const onRegionClick = vi.fn()

		const { container } = renderUI(categoricalPlat({ tooltip: false, onRegionClick }))

		const plot = bySlot(container, 'map-plot')

		expect(plot).toHaveAttribute('tabindex', '0')

		fireEvent.keyDown(plot as Element, { key: 'ArrowRight' })

		fireEvent.keyDown(plot as Element, { key: 'Enter' })

		expect(onRegionClick).toHaveBeenCalledWith('A', 0)
	})

	it('speaks the name of each region a key moves onto when the readout is off', async () => {
		const { plot } = renderNavigable(categoricalPlat({ tooltip: false, onRegionClick: vi.fn() }))

		// No tooltip shows the name, so the live region carries it alone.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Alpha'))

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Beta'))
	})

	it('speaks the new scale for each zoom key', async () => {
		const { plot } = renderNavigable(categoricalPlat({ zoom: true }))

		fireEvent.keyDown(plot, { key: '+' })

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Zoom 160%'))

		fireEvent.keyDown(plot, { key: '+' })

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Zoom 256%'))

		fireEvent.keyDown(plot, { key: '-' })

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Zoom 160%'))

		fireEvent.keyDown(plot, { key: '0' })

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Zoom reset'))
	})

	it('takes no tab stop before the geography lands', () => {
		const { container, rerender } = renderUI(categoricalPlat({ geography: null }))

		expect(bySlot(container, 'map-plot')).not.toHaveAttribute('tabindex')

		rerender(categoricalPlat())

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
		const { container } = renderUI(categoricalPlat({ data: [{ state: 'Z', zone: 'East' }] }))

		expect(bySlot(container, 'map-plot')).not.toHaveAttribute('tabindex')

		expect(bySlot(container, 'map-table')).toBeNull()
	})

	it('offers no region stop where the caller switched the layer off', () => {
		// `regionPointer={false}` withdraws the readout, the pick, and the menu at
		// once, and the keyboard is the channel that does not take care of itself:
		// the paths bind no handlers, so nothing can be POINTED at, but the cursor
		// reaches a region through the stop list rather than through the DOM. Left
		// ungated, a reader arrowed onto the drilled state, heard it named, pressed
		// Enter, and got nothing — the pick the same switch had already emptied.
		const onRegionClick = vi.fn()

		const { container, plot } = renderNavigable(
			categoricalPlat({ regionPointer: false, onRegionClick }),
		)

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(readout(container)).toBeNull()

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onRegionClick).not.toHaveBeenCalled()
	})

	it('keeps the stop while the legend holds every category off', () => {
		// A toggle is transient: it silences the readout for as long as it holds,
		// and to take the tab stop away with it would move focus under the reader.
		const { container } = renderNavigable(categoricalPlat())

		const toggles = allBySlot(container, 'map-legend-item')

		expect(toggles).toHaveLength(2)

		for (const toggle of toggles) fireEvent.click(toggle)

		expect(bySlot(container, 'map-plot')).toHaveAttribute('tabindex', '0')
	})
})
