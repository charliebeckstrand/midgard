import { describe, expect, it, vi } from 'vitest'
import { MapMarker, MapPlat, MapPoint, MapRoute } from '../../modules/map'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/** The fixture spans lon 0–30, lat 0–10; these all project inside the frame. */
const DEPOT: [number, number] = [5, 5]

const YARD: [number, number] = [25, 5]

function plat(children: React.ReactNode) {
	return (
		<MapPlat aria-label="Fleet" geography={FIXTURE_GEOJSON} width={400}>
			{children}
		</MapPlat>
	)
}

/** Gives the plot's SVG a real box, so a keyboard cursor can place its readout. */
function boxed(container: HTMLElement) {
	const svg = container.querySelector('svg')

	if (svg === null) throw new Error('the plat drew no SVG')

	vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
		left: 0,
		top: 0,
		width: 400,
		height: 200,
		right: 400,
		bottom: 200,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	})
}

describe('overlay identity and click', () => {
	it('reports the caller id from a click on a point', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			plat(<MapPoint id="depot" label="Depot" at={DEPOT} onClick={onClick} />),
		)

		fireEvent.click(bySlot(container, 'map-point-hit') as Element)

		expect(onClick).toHaveBeenCalledWith('depot')
	})

	it('reports it from a route and from a marker too', () => {
		const onRoute = vi.fn()

		const onMarker = vi.fn()

		const { container } = renderUI(
			plat(
				<>
					<MapRoute id="leg" label="Leg" stops={[DEPOT, YARD]} onClick={onRoute} />

					<MapMarker id="run" label="Run" start={DEPOT} end={YARD} onClick={onMarker} />
				</>,
			),
		)

		fireEvent.click(bySlot(container, 'map-route-hit') as Element)

		expect(onRoute).toHaveBeenCalledWith('leg')

		fireEvent.click(bySlot(container, 'map-marker-hit') as Element)

		expect(onMarker).toHaveBeenCalledWith('run')
	})

	it('reports a right-click through its own handler', () => {
		const onContextMenu = vi.fn()

		const { container } = renderUI(
			plat(<MapPoint id="depot" label="Depot" at={DEPOT} onContextMenu={onContextMenu} />),
		)

		fireEvent.contextMenu(bySlot(container, 'map-point-hit') as Element)

		expect(onContextMenu).toHaveBeenCalledWith('depot')
	})

	it('carries a pointer affordance only where a click is answered', () => {
		const { container } = renderUI(
			plat(<MapPoint id="depot" label="Depot" at={DEPOT} onClick={() => {}} />),
		)

		expect(bySlot(container, 'map-point-hit')).toHaveClass('cursor-pointer')

		const inert = renderUI(plat(<MapPoint id="depot" label="Depot" at={DEPOT} />))

		expect(bySlot(inert.container, 'map-point-hit')).not.toHaveClass('cursor-pointer')
	})

	it('reports an opaque but stable identity when the caller names none', () => {
		const onClick = vi.fn()

		const { container } = renderUI(plat(<MapPoint label="Depot" at={DEPOT} onClick={onClick} />))

		fireEvent.click(bySlot(container, 'map-point-hit') as Element)

		expect(onClick).toHaveBeenCalledTimes(1)

		expect(typeof onClick.mock.calls[0]?.[0]).toBe('string')
	})

	it('answers a click on every part of a marker', () => {
		// A marker draws three hit shapes — the connector and both pins — and all
		// of them are the one mark.
		const onClick = vi.fn()

		const { container } = renderUI(
			plat(<MapMarker id="run" label="Run" start={DEPOT} end={YARD} onClick={onClick} />),
		)

		for (const slot of ['map-marker-hit', 'map-marker-start-hit', 'map-marker-end-hit']) {
			fireEvent.click(bySlot(container, slot) as Element)
		}

		expect(onClick).toHaveBeenCalledTimes(3)

		expect(onClick).toHaveBeenLastCalledWith('run')
	})

	it('keeps an inline handler from churning the legend', () => {
		// The reporters ride a ref, not the registration deps: an inline arrow is a
		// fresh identity every render, and a re-registration re-sorts the ledger
		// and re-renders the legend.
		const { container, rerender } = renderUI(
			plat(<MapPoint id="depot" label="Depot" at={DEPOT} onClick={() => {}} />),
		)

		rerender(plat(<MapPoint id="depot" label="Depot" at={DEPOT} onClick={() => {}} />))

		expect(allBySlot(container, 'map-legend-item')).toHaveLength(1)
	})
})

describe('overlay keyboard reach', () => {
	it('steps onto an overlay and picks it with Enter', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			plat(<MapPoint id="yard" label="Yard" at={YARD} onClick={onClick} />),
		)

		boxed(container)

		const plot = bySlot(container, 'map-plot') as Element

		// The regions lead the stop list, so End reaches the overlay drawn over
		// them — the mark a pointer-only click would have stranded.
		fireEvent.keyDown(plot, { key: 'End' })

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onClick).toHaveBeenCalledWith('yard')
	})

	it('reads the overlay out as the cursor lands on it', () => {
		const { container } = renderUI(plat(<MapPoint id="yard" label="Yard" at={YARD} detail="12" />))

		boxed(container)

		const plot = bySlot(container, 'map-plot') as Element

		fireEvent.keyDown(plot, { key: 'End' })

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Yard')

		expect(tooltip?.textContent).toContain('12')
	})

	it('takes a tab stop for a clickable mark even with no readout', () => {
		// tooltip={false} with an overlay onClick and no onRegionClick is still a
		// picker. Gating the tab stop on the region half alone would leave it
		// unreachable by keyboard.
		const onClick = vi.fn()

		const { container } = renderUI(
			<MapPlat aria-label="Fleet" geography={FIXTURE_GEOJSON} width={400} tooltip={false}>
				<MapPoint id="yard" label="Yard" at={YARD} onClick={onClick} />
			</MapPlat>,
		)

		boxed(container)

		const plot = bySlot(container, 'map-plot') as Element

		expect(plot).toHaveAttribute('tabindex', '0')

		fireEvent.keyDown(plot, { key: 'End' })

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onClick).toHaveBeenCalledWith('yard')
	})

	it('takes no tab stop for a mark that answers nothing', () => {
		const { container } = renderUI(
			<MapPlat aria-label="Fleet" geography={FIXTURE_GEOJSON} width={400} tooltip={false}>
				<MapPoint id="yard" label="Yard" at={YARD} />
			</MapPlat>,
		)

		expect(bySlot(container, 'map-plot')).not.toHaveAttribute('tabindex')
	})

	it('skips a mark the legend has toggled off', () => {
		// A hidden overlay unmounts its shapes but keeps its registration. Without
		// the gate the cursor would stand on a mark that draws nothing, read it
		// out, and pick it.
		const onClick = vi.fn()

		const { container } = renderUI(
			plat(<MapPoint id="yard" label="Yard" at={YARD} onClick={onClick} />),
		)

		boxed(container)

		const plot = bySlot(container, 'map-plot') as Element

		fireEvent.keyDown(plot, { key: 'End' })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Yard')

		// Toggle the entry off through its legend button, then re-enter the map.
		fireEvent.click(bySlot(container, 'map-legend-item') as Element)

		fireEvent.keyDown(plot, { key: 'Escape' })

		fireEvent.keyDown(plot, { key: 'End' })

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onClick).not.toHaveBeenCalled()

		expect(bySlot(container, 'tooltip-content')?.textContent ?? '').not.toContain('Yard')
	})

	it('picks nothing on a mark that answers no click', () => {
		const { container } = renderUI(plat(<MapPoint id="yard" label="Yard" at={YARD} />))

		boxed(container)

		const plot = bySlot(container, 'map-plot') as Element

		fireEvent.keyDown(plot, { key: 'End' })

		// The stop still reads out; Enter simply has nothing to call.
		expect(() => fireEvent.keyDown(plot, { key: 'Enter' })).not.toThrow()

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Yard')
	})
})
