import { describe, expect, it, vi } from 'vitest'
import { Dialog, DialogPanel } from '../../components/dialog'
import { type LngLat, MapGeofence, MapPlat, MapPoint, MapRoute } from '../../modules/map'
import { LocaleProvider } from '../../providers/locale'
import {
	act,
	allBySlot,
	bySlot,
	expectAnnouncement,
	fireEvent,
	flushAnnouncer,
	liveRegion,
	renderUI,
	waitFor,
} from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'
import { renderNavigable } from '../helpers/map-navigable'
import { categoricalPlat, overlayPlat } from '../helpers/map-plat'
import { allRegions, layerScale } from '../helpers/map-queries'

/**
 * The center of a region path's box, in frame units. The fixture regions are
 * squares, so the center is where the cursor's stop stands.
 */
function regionCenter(path: SVGPathElement): { x: number; y: number } {
	const values = (path.getAttribute('d') ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []

	const xs = values.filter((_, index) => index % 2 === 0)

	const ys = values.filter((_, index) => index % 2 === 1)

	return {
		x: (Math.min(...xs) + Math.max(...xs)) / 2,
		y: (Math.min(...ys) + Math.max(...ys)) / 2,
	}
}

/** Where the zoom layer draws a frame point, read off its own transform attribute. */
function drawnAt(container: HTMLElement, at: { x: number; y: number }): { x: number; y: number } {
	const transform = bySlot(container, 'map-zoom')?.getAttribute('transform') ?? ''

	const [x = 0, y = 0, k = 1] =
		/translate\((-?[\d.]+) (-?[\d.]+)\) scale\((-?[\d.]+)\)/
			.exec(transform)
			?.slice(1)
			.map(Number) ?? []

	return { x: at.x * k + x, y: at.y * k + y }
}

/** The tooltip's current text, or `null` while the readout is away. */
function readout(container: HTMLElement): string | null {
	return bySlot(container, 'tooltip-content')?.textContent ?? null
}

describe('MapPlat keyboard navigation', () => {
	it('makes the plot region one tab stop', () => {
		const { plot } = renderNavigable(categoricalPlat())

		// The stop is the role="img" region itself, never a region path: the SVG
		// is aria-hidden, so a focusable path would be an unreachable stop, and
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

	it('clears the cursor and its readout when the geography changes in place', () => {
		const { container, plot, rerender } = renderNavigable(categoricalPlat())

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(readout(container)).toContain('Beta')

		// The same plat takes a new atlas in which index 1 is Alpha, a region with
		// a row. The old index must not light it.
		const { features } = FIXTURE_GEOJSON

		const turned = [...features.slice(2), ...features.slice(0, 2)]

		rerender(categoricalPlat({ geography: { ...FIXTURE_GEOJSON, features: turned } }))

		expect(readout(container)).toBeNull()

		// The next key enters the new atlas afresh: End lands on its last stop.
		fireEvent.keyDown(plot, { key: 'End' })

		expect(readout(container)).toContain('Beta')
	})

	it('clears the readout when the new geography remounts the plot', () => {
		const { container, plot, rerender } = renderNavigable(categoricalPlat({ legend: 'right' }))

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(readout(container)).toContain('Beta')

		// A side legend sits in another layout, so its removal remounts the plot,
		// and the cursor with it. The readout lives above the plot.
		const { features } = FIXTURE_GEOJSON

		const turned = [...features.slice(2), ...features.slice(0, 2)]

		rerender(
			categoricalPlat({ legend: undefined, geography: { ...FIXTURE_GEOJSON, features: turned } }),
		)

		expect(readout(container)).toBeNull()
	})

	it('keeps the focused plot when the legend moves between a side and a band', () => {
		const { container, plot, rerender } = renderNavigable(categoricalPlat({ legend: 'right' }))

		act(() => plot.focus())

		// A drill-down hands the same plat a new atlas without the side legend. The
		// plot that holds focus must stay mounted, or focus falls to the page.
		rerender(categoricalPlat({ legend: 'bottom' }))

		expect(bySlot(container, 'map-plot')).toBe(plot)

		expect(plot).toHaveFocus()

		rerender(categoricalPlat({ legend: 'left' }))

		expect(bySlot(container, 'map-plot')).toBe(plot)

		expect(plot).toHaveFocus()
	})

	it('jumps to the ends of the atlas order with Home and End', () => {
		const { container, plot } = renderNavigable(categoricalPlat())

		fireEvent.keyDown(plot, { key: 'End' })

		// Gamma matches no row, so it reads nothing: the same silence the pointer
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

	it('picks nothing with Enter on a disabled region, and speaks nothing where it reads nothing', async () => {
		const onRegionClick = vi.fn()

		const { plot } = renderNavigable(
			categoricalPlat({ onRegionClick, isRegionDisabled: (id) => id === 'C' }),
		)

		// Gamma matches no row and is disabled, so it is a stop with no output.
		fireEvent.keyDown(plot, { key: 'End' })

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onRegionClick).not.toHaveBeenCalled()

		await flushAnnouncer()

		expect(liveRegion()?.textContent ?? '').toBe('')

		fireEvent.keyDown(plot, { key: 'Home' })

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onRegionClick).toHaveBeenCalledWith('A', 0)
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

		act(() => plot.focus())

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(fireEvent.keyDown(plot, { key: 'Escape' })).toBe(false)

		expect(document.activeElement).not.toBe(plot)
	})

	it('claims Escape when it clears a readout that the pointer holds', () => {
		const { container, plot } = renderNavigable(categoricalPlat())

		const [alpha] = allRegions(container)

		fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 })

		expect(readout(container)).toContain('Alpha')

		act(() => plot.focus())

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

		act(() => plot.focus())

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

		await flushAnnouncer()

		expect(liveRegion()?.textContent ?? '').toBe('')
	})

	it('speaks the name of a stop with no readout where Enter picks it', async () => {
		const { container, plot } = renderNavigable(categoricalPlat({ onRegionClick: vi.fn() }))

		// Gamma matches no row, but Enter picks it, so the reader hears what it picks.
		fireEvent.keyDown(plot, { key: 'End' })

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Gamma'))

		// A category the legend holds off reads nothing, and it is a pick as well.
		fireEvent.click(allBySlot(container, 'map-legend-item')[0] as Element)

		fireEvent.keyDown(plot, { key: 'Home' })

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Alpha'))
	})

	it('speaks the name of each region on a zoom map whose regions answer a preload', async () => {
		// No rows, no pick, and no `nameRegions`: the preload makes each region a
		// stop, so each stop must still say where the cursor is.
		const { plot } = renderNavigable(
			<MapPlat
				aria-label="Regions"
				geography={FIXTURE_GEOJSON}
				width={400}
				zoom
				onRegionPreload={vi.fn()}
			/>,
		)

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Alpha'))
	})

	it('takes no tab stop when the cursor would have nothing to output', () => {
		const { container } = renderUI(categoricalPlat({ tooltip: false }))

		expect(bySlot(container, 'map-plot')).not.toHaveAttribute('tabindex')
	})

	it('stays navigable without a readout when the map is still a picker', () => {
		// tooltip={false} with onRegionClick is a supported pairing. Gating the tab
		// stop on the readout alone would leave that picker unreachable by keyboard:
		// the cursor still isolates the region it sits on, so it stays legible.
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

	it('speaks the name of each region on a picker with no data', async () => {
		// A plain region picker: no rows, so no readout, and the pick alone earns
		// the stop. The names are still the whole of what the reader hears.
		const onRegionClick = vi.fn()

		const { container, plot } = renderNavigable(
			<MapPlat
				aria-label="Pick a region"
				geography={FIXTURE_GEOJSON}
				width={400}
				onRegionClick={onRegionClick}
			/>,
		)

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Alpha'))

		// The names reach the announcement only: no tooltip and no table.
		expect(readout(container)).toBeNull()

		expect(bySlot(container, 'map-table')).toBeNull()

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onRegionClick).toHaveBeenCalledWith('A', 0)
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

	it("pans a zoom step to keep the cursor's stop in the frame", () => {
		const { container, plot, svg } = renderNavigable(categoricalPlat({ zoom: true }))

		// Gamma is the east end of the fixture, far from the frame's center.
		fireEvent.keyDown(plot, { key: 'End' })

		for (let step = 0; step < 3; step++) fireEvent.keyDown(plot, { key: '+' })

		const gamma = allRegions(container)[2]

		if (gamma === undefined) throw new Error('the plat drew no Gamma region')

		const [, , width = 0, height = 0] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number)

		// The region layer carries its paths on a refit scale of its own.
		const refit = layerScale(bySlot(container, 'map-regions'))

		const center = regionCenter(gamma)

		const drawn = drawnAt(container, { x: center.x * refit, y: center.y * refit })

		expect(drawn.x).toBeGreaterThan(0)

		expect(drawn.x).toBeLessThan(width)

		expect(drawn.y).toBeGreaterThan(0)

		expect(drawn.y).toBeLessThan(height)
	})

	it('leaves a key chord with Ctrl, Meta, or Alt to the browser', () => {
		const { container, plot } = renderNavigable(categoricalPlat({ zoom: true }))

		// The browser's own page zoom and history keys. A claimed chord would zoom
		// the map and could block the page zoom.
		for (const modifier of ['ctrlKey', 'metaKey', 'altKey'] as const) {
			for (const key of ['=', '+', '-', '0', 'ArrowLeft', 'ArrowRight']) {
				expect(fireEvent.keyDown(plot, { key, [modifier]: true })).toBe(true)
			}
		}

		expect(liveRegion()?.textContent ?? '').toBe('')

		expect(readout(container)).toBeNull()

		// Shift stays a plain press, because `+` needs it on most layouts.
		expect(fireEvent.keyDown(plot, { key: '+', shiftKey: true })).toBe(false)
	})

	it('claims a navigation key on a zoom map with no stop and keeps focus on it', () => {
		// The zoom earns the stop on a map that offers nothing to navigate. A
		// navigation key is claimed and moves nothing, so the page does not scroll,
		// and only Escape leaves the region.
		const { plot } = renderNavigable(
			<MapPlat aria-label="Backdrop" geography={FIXTURE_GEOJSON} width={400} zoom />,
		)

		act(() => plot.focus())

		for (const key of ['ArrowRight', 'ArrowDown', 'Home', 'End']) {
			expect(fireEvent.keyDown(plot, { key })).toBe(false)

			expect(document.activeElement).toBe(plot)
		}

		fireEvent.keyDown(plot, { key: 'Escape' })

		expect(document.activeElement).not.toBe(plot)
	})

	it('takes no tab stop before the geography lands', () => {
		const { container, rerender } = renderUI(categoricalPlat({ geography: null }))

		expect(bySlot(container, 'map-plot')).not.toHaveAttribute('tabindex')

		rerender(categoricalPlat())

		expect(bySlot(container, 'map-plot')).toHaveAttribute('tabindex', '0')
	})

	it('keeps the focused plot while the geography is away, and drops the stop on blur', () => {
		const { container, plot, rerender } = renderNavigable(categoricalPlat())

		act(() => plot.focus())

		rerender(categoricalPlat({ geography: null }))

		expect(document.activeElement).toBe(plot)

		expect(plot).toHaveAttribute('tabindex', '0')

		rerender(categoricalPlat())

		expect(document.activeElement).toBe(plot)

		rerender(categoricalPlat({ geography: null }))

		act(() => plot.blur())

		expect(bySlot(container, 'map-plot')).not.toHaveAttribute('tabindex')
	})

	it('keeps the focused plot when the last pick goes away', () => {
		const onRegionClick = vi.fn()

		const { plot, rerender } = renderNavigable(categoricalPlat({ tooltip: false, onRegionClick }))

		act(() => plot.focus())

		rerender(categoricalPlat({ tooltip: false }))

		expect(document.activeElement).toBe(plot)

		expect(plot).toHaveAttribute('tabindex', '0')

		// With no output left, a key does nothing and leaves the page its default.
		expect(fireEvent.keyDown(plot, { key: 'ArrowRight' })).toBe(true)

		act(() => plot.blur())

		expect(plot).not.toHaveAttribute('tabindex')
	})

	it('takes no tab stop on a map with nothing to read out', () => {
		// A backdrop: geography, no rows, no marks. `tooltip` asks for a readout
		// rather than asserting one, and all three channels are silent here (an
		// unmatched region raises no tooltip, takes no emphasis, and fills no table
		// row) so the stop would answer every key with nothing.
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
		// Enter, and got nothing: the pick the same switch had already emptied.
		const onRegionClick = vi.fn()

		const { container, plot } = renderNavigable(
			categoricalPlat({ regionPointer: false, onRegionClick }),
		)

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(readout(container)).toBeNull()

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onRegionClick).not.toHaveBeenCalled()
	})

	it('takes no tab stop where the caller switched off a layer that was the only output', () => {
		// The rows match, so the regions have a readout. But `regionPointer={false}`
		// withdraws it, and no mark or zoom earns the stop. A stop there answers every
		// key with nothing.
		const { container } = renderUI(categoricalPlat({ regionPointer: false }))

		expect(bySlot(container, 'map-plot')).not.toHaveAttribute('tabindex')
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

describe('MapPlat keyboard over marks that move', () => {
	/** Two points on the fixture's middle row: Pea at the center, and Queue where the case puts it. */
	function pair(queue: LngLat) {
		return overlayPlat(
			<>
				<MapPoint id="pea" label="Pea" at={[15, 5]} />

				<MapPoint id="queue" label="Queue" at={queue} />
			</>,
		)
	}

	it('steps by where a mark stands now, after it moved', () => {
		const { container, plot, rerender } = renderNavigable(pair([25, 5]))

		fireEvent.keyDown(plot, { key: 'Home' })

		expect(readout(container)).toBe('Pea')

		// Queue moves from the east of Pea to the west of it.
		rerender(pair([2, 5]))

		fireEvent.keyDown(plot, { key: 'ArrowLeft' })

		expect(readout(container)).toBe('Queue')
	})

	it('steps by where a route runs now, after its stops changed', () => {
		function route(stops: LngLat[]) {
			return overlayPlat(
				<>
					<MapPoint id="pea" label="Pea" at={[15, 5]} />

					<MapRoute id="leg" label="Leg" stops={stops} />
				</>,
			)
		}

		const { container, plot, rerender } = renderNavigable(
			route([
				[22, 5],
				[28, 5],
			]),
		)

		fireEvent.keyDown(plot, { key: 'Home' })

		expect(readout(container)).toBe('Pea')

		rerender(
			route([
				[2, 5],
				[8, 5],
			]),
		)

		fireEvent.keyDown(plot, { key: 'ArrowLeft' })

		expect(readout(container)).toBe('Leg')
	})
})

describe('MapPlat keyboard over marks that draw nothing', () => {
	it('stops nowhere on a one-stop route or a zero-radius zone', () => {
		const { container, plot } = renderNavigable(
			overlayPlat(
				<>
					<MapPoint id="pea" label="Pea" at={[15, 5]} />

					<MapRoute id="leg" label="Leg" stops={[[2, 5]]} />

					<MapGeofence id="void" label="Void" at={[28, 5]} radius={0} />
				</>,
			),
		)

		// Neither mark draws a line or a ring, so the point is the one stop. Each key
		// that would step onto the route or the zone holds the cursor on the point.
		for (const key of ['Home', 'ArrowLeft', 'ArrowRight', 'End']) {
			fireEvent.keyDown(plot, { key })

			expect(readout(container)).toBe('Pea')
		}
	})
})

describe('MapPlat keyboard in a locale', () => {
	it('speaks the zoom in the language and the number format of the locale', async () => {
		const { plot } = renderNavigable(
			<LocaleProvider locale="es-ES">{categoricalPlat({ zoom: true })}</LocaleProvider>,
		)

		fireEvent.keyDown(plot, { key: '+' })

		// Spanish writes a space before the percent sign.
		await waitFor(() => expect(liveRegion()?.textContent).toBe('Zoom 160\u00a0%'))

		fireEvent.keyDown(plot, { key: '0' })

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Zoom restablecido'))
	})
})
