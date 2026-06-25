import { describe, expect, it, vi } from 'vitest'
import {
	MapGeofence,
	MapMarker,
	MapRoute,
	MapShipment,
	MapSkeleton,
	Map as MapView,
	type RouteData,
	type ShipmentData,
} from '../../modules/map'
import { allBySlot, bySlot, renderUI, screen, userEvent, waitFor } from '../helpers'

const route: RouteData = {
	id: 'r1',
	stops: [
		{ id: 's1', name: 'A', position: [0, 0], status: 'done' },
		{ id: 's2', name: 'B', position: [1, 1], status: 'active' },
		{ id: 's3', name: 'C', position: [2, 2], status: 'pending' },
	],
}

const shipment: ShipmentData = {
	id: 'sh1',
	label: 'Truck 7',
	position: [0, 0],
	status: 'In transit',
	info: [{ label: 'Driver', value: 'J. Doe' }],
}

describe('Map', () => {
	it('names an interactive map as an application region when label is set', () => {
		const { container } = renderUI(<MapView label="Delivery map" />)

		const el = bySlot(container, 'map')

		expect(el).toHaveAttribute('role', 'application')

		expect(el).toHaveAttribute('aria-label', 'Delivery map')
	})

	it('names a static map as a labelled group when label is set', () => {
		const { container } = renderUI(<MapView label="Coverage area" interactive={false} />)

		// role="group" (not "img") so interactive markers inside stay reachable.
		expect(bySlot(container, 'map')).toHaveAttribute('role', 'group')
	})

	it('flags itself ready once the underlying map loads', async () => {
		const { container } = renderUI(<MapView />)

		await waitFor(() => expect(bySlot(container, 'map')).toHaveAttribute('data-ready', ''))
	})

	it('mounts children only after the map is ready', async () => {
		const { container } = renderUI(
			<MapView>
				<MapMarker position={[0, 0]} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))
	})

	it('fills the container with a placeholder while loading, then clears it once ready', async () => {
		const { container } = renderUI(<MapView />)

		// Before the map fires `load`, the skeleton placeholder stands in.
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()

		await waitFor(() => expect(bySlot(container, 'map')).toHaveAttribute('data-ready', ''))

		expect(bySlot(container, 'placeholder')).toBeNull()
	})
})

describe('MapSkeleton', () => {
	it('renders a placeholder hidden from assistive technology', () => {
		const { container } = renderUI(<MapSkeleton />)

		expect(bySlot(container, 'placeholder')).toHaveAttribute('aria-hidden', 'true')
	})
})

describe('MapMarker', () => {
	it('renders a marker element inside the map', async () => {
		const { container } = renderUI(
			<MapView>
				<MapMarker position={[0, 0]} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))
	})

	it('applies a custom className to the marker element', async () => {
		const { container } = renderUI(
			<MapView>
				<MapMarker position={[0, 0]} className="custom-pin" />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const marker = bySlot(container, 'map-marker') as HTMLElement

		expect(marker.className).toContain('custom-pin')
	})

	it('invokes onClick when the marker element is clicked', async () => {
		const onClick = vi.fn()

		const user = userEvent.setup()

		const { container } = renderUI(
			<MapView>
				<MapMarker position={[0, 0]} onClick={onClick} aria-label="Open shipment" />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const marker = bySlot(container, 'map-marker') as HTMLElement

		await user.click(marker)

		expect(onClick).toHaveBeenCalled()
	})

	it('exposes an interactive marker as a named, focusable button', async () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			<MapView>
				<MapMarker position={[0, 0]} onClick={onClick} aria-label="Open shipment" />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const marker = bySlot(container, 'map-marker') as HTMLElement

		await waitFor(() => expect(marker).toHaveAttribute('role', 'button'))

		expect(marker).toHaveAttribute('tabindex', '0')

		expect(marker).toHaveAttribute('aria-label', 'Open shipment')
	})

	it('activates an interactive marker with Enter and Space', async () => {
		const onClick = vi.fn()

		const user = userEvent.setup()

		const { container } = renderUI(
			<MapView>
				<MapMarker position={[0, 0]} onClick={onClick} aria-label="Open shipment" />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const marker = bySlot(container, 'map-marker') as HTMLElement

		await waitFor(() => expect(marker).toHaveAttribute('tabindex', '0'))

		marker.focus()

		await user.keyboard('{Enter}')

		await user.keyboard(' ')

		expect(onClick).toHaveBeenCalledTimes(2)
	})

	it('does not expose a non-interactive marker as a button', async () => {
		const { container } = renderUI(
			<MapView>
				<MapMarker position={[0, 0]} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const marker = bySlot(container, 'map-marker') as HTMLElement

		expect(marker).not.toHaveAttribute('role')

		expect(marker).not.toHaveAttribute('tabindex')
	})

	it('renders custom children inside the marker portal', async () => {
		const { container } = renderUI(
			<MapView>
				<MapMarker position={[0, 0]}>
					<span data-testid="pin-child">PIN</span>
				</MapMarker>
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		expect(screen.getByTestId('pin-child')).toBeInTheDocument()
	})

	it('respects an explicit anchor without throwing', async () => {
		const { container } = renderUI(
			<MapView>
				<MapMarker position={[0, 0]} anchor="bottom-right" />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))
	})
})

describe('MapRoute', () => {
	it('renders one marker per stop by default', async () => {
		const { container } = renderUI(
			<MapView>
				<MapRoute data={route} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(route.stops.length))
	})

	it('renders each stop marker as a labelled button', async () => {
		renderUI(
			<MapView>
				<MapRoute data={route} />
			</MapView>,
		)

		for (const stop of route.stops) {
			await waitFor(() =>
				expect(screen.getByRole('button', { name: stop.name })).toBeInTheDocument(),
			)
		}
	})

	it('hides stop markers when showStops is false', async () => {
		const { container } = renderUI(
			<MapView>
				<MapRoute data={route} showStops={false} />
			</MapView>,
		)

		// Wait a tick for the map to load.
		await waitFor(() => expect(bySlot(container, 'map')).toHaveAttribute('data-ready', ''))

		expect(allBySlot(container, 'map-marker').length).toBe(0)
	})

	it('closes the timeline sheet when the close button is clicked', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<MapView>
				<MapRoute data={route} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(route.stops.length))

		const marker = bySlot(container, 'map-marker')

		if (!marker) throw new Error('marker missing')

		await user.click(marker)

		expect(screen.getByText('Route timeline')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Close' }))

		expect(screen.queryByText('Route timeline')).not.toBeInTheDocument()
	})
})

describe('MapShipment', () => {
	it('renders a clickable pin', async () => {
		const { container } = renderUI(
			<MapView>
				<MapShipment data={shipment} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))
	})

	it('opens the info dialog when the pin is clicked', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<MapView>
				<MapShipment data={shipment} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const pin = bySlot(container, 'map-marker')

		if (!pin) throw new Error('pin missing')

		await user.click(pin)

		expect(screen.getByText('Truck 7')).toBeInTheDocument()

		expect(screen.getByText('Driver')).toBeInTheDocument()
	})

	it('hides the chat tab when no messages and no onSendMessage', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<MapView>
				<MapShipment data={shipment} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const pin = bySlot(container, 'map-marker')

		if (!pin) throw new Error('pin missing')

		await user.click(pin)

		expect(screen.queryByRole('tab', { name: 'Chat' })).not.toBeInTheDocument()
	})

	it('shows the chat tab when onSendMessage is provided', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<MapView>
				<MapShipment data={shipment} onSendMessage={() => {}} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const pin = bySlot(container, 'map-marker')

		if (!pin) throw new Error('pin missing')

		await user.click(pin)

		expect(screen.getByRole('tab', { name: 'Chat' })).toBeInTheDocument()
	})

	it('renders ETA when supplied', async () => {
		const user = userEvent.setup()

		const withEta: ShipmentData = {
			...shipment,
			eta: new Date(2025, 0, 15, 10, 30).toISOString(),
		}

		const { container } = renderUI(
			<MapView>
				<MapShipment data={withEta} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const pin = bySlot(container, 'map-marker')

		if (!pin) throw new Error('pin missing')

		await user.click(pin)

		expect(screen.getByText('ETA')).toBeInTheDocument()
	})

	it('falls back to raw ETA when unparsable', async () => {
		const user = userEvent.setup()

		const withBadEta: ShipmentData = {
			...shipment,
			eta: 'not-a-date',
		}

		const { container } = renderUI(
			<MapView>
				<MapShipment data={withBadEta} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const pin = bySlot(container, 'map-marker')

		if (!pin) throw new Error('pin missing')

		await user.click(pin)

		expect(screen.getByText('not-a-date')).toBeInTheDocument()
	})

	it('shows the empty-details alert when no info rows are present', async () => {
		const user = userEvent.setup()

		const empty: ShipmentData = { id: 'e', label: 'Empty', position: [0, 0] }

		const { container } = renderUI(
			<MapView>
				<MapShipment data={empty} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const pin = bySlot(container, 'map-marker')

		if (!pin) throw new Error('pin missing')

		await user.click(pin)

		expect(screen.getByText('No shipment details available.')).toBeInTheDocument()
	})

	it('skips the default dialog when onSelect returns false', async () => {
		const user = userEvent.setup()

		const onSelect = vi.fn(() => false)

		const { container } = renderUI(
			<MapView>
				<MapShipment data={shipment} onSelect={onSelect} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const pin = bySlot(container, 'map-marker')

		if (!pin) throw new Error('pin missing')

		await user.click(pin)

		expect(onSelect).toHaveBeenCalledWith(shipment)

		expect(screen.queryByText('Truck 7')).not.toBeInTheDocument()
	})

	it('closes the dialog via the Close button', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<MapView>
				<MapShipment data={shipment} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const pin = bySlot(container, 'map-marker')

		if (!pin) throw new Error('pin missing')

		await user.click(pin)

		expect(screen.getByText('Truck 7')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Close' }))

		await waitFor(() => expect(screen.queryByText('Driver')).not.toBeInTheDocument())
	})

	it('renders an empty-chat alert when the chat tab has no messages', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<MapView>
				<MapShipment data={shipment} onSendMessage={() => {}} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const pin = bySlot(container, 'map-marker')

		if (!pin) throw new Error('pin missing')

		await user.click(pin)

		await user.click(screen.getByRole('tab', { name: 'Chat' }))

		expect(screen.getByText('No messages yet')).toBeInTheDocument()
	})

	it('renders existing chat messages with author and timestamp', async () => {
		const user = userEvent.setup()

		const withMessages: ShipmentData = {
			...shipment,
			messages: [
				{
					id: 'm1',
					author: 'me',
					body: 'Hello driver',
					timestamp: new Date(2025, 0, 1, 9, 0),
				},
				{
					id: 'm2',
					author: 'them',
					body: 'Reply from driver',
				},
			],
		}

		const { container } = renderUI(
			<MapView>
				<MapShipment data={withMessages} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const pin = bySlot(container, 'map-marker')

		if (!pin) throw new Error('pin missing')

		await user.click(pin)

		await user.click(screen.getByRole('tab', { name: 'Chat' }))

		expect(screen.getByText('Hello driver')).toBeInTheDocument()

		expect(screen.getByText('Reply from driver')).toBeInTheDocument()
	})

	it('sends a message via the chat composer', async () => {
		const user = userEvent.setup()

		const onSendMessage = vi.fn()

		const { container } = renderUI(
			<MapView>
				<MapShipment data={shipment} onSendMessage={onSendMessage} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const pin = bySlot(container, 'map-marker')

		if (!pin) throw new Error('pin missing')

		await user.click(pin)

		await user.click(screen.getByRole('tab', { name: 'Chat' }))

		const input = screen.getByLabelText('Message') as HTMLInputElement

		await user.type(input, 'ping')

		await user.type(input, '{Enter}')

		expect(onSendMessage).toHaveBeenCalledWith('ping')
	})

	it('does not send when the draft is blank', async () => {
		const user = userEvent.setup()

		const onSendMessage = vi.fn()

		const { container } = renderUI(
			<MapView>
				<MapShipment data={shipment} onSendMessage={onSendMessage} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))

		const pin = bySlot(container, 'map-marker')

		if (!pin) throw new Error('pin missing')

		await user.click(pin)

		await user.click(screen.getByRole('tab', { name: 'Chat' }))

		const input = screen.getByLabelText('Message') as HTMLInputElement

		await user.type(input, '   ')

		await user.type(input, '{Enter}')

		expect(onSendMessage).not.toHaveBeenCalled()
	})
})

describe('MapGeofence', () => {
	it('mounts without throwing', async () => {
		const { container } = renderUI(
			<MapView>
				<MapGeofence shape={{ type: 'circle', center: [0, 0], radiusMeters: 500 }} />
			</MapView>,
		)

		await waitFor(() => expect(bySlot(container, 'map')).toHaveAttribute('data-ready', ''))
	})

	it('renders a polygon shape', async () => {
		const { container } = renderUI(
			<MapView>
				<MapGeofence
					shape={{
						type: 'polygon',
						coordinates: [
							[0, 0],
							[1, 0],
							[1, 1],
							[0, 1],
						],
					}}
				/>
			</MapView>,
		)

		await waitFor(() => expect(bySlot(container, 'map')).toHaveAttribute('data-ready', ''))
	})

	it('renders a polygon whose first and last coordinates already match', async () => {
		// Already-closed ring exercises the early-return branch in `toPolygon`
		// that skips re-appending `first` when `first === last`.
		const { container } = renderUI(
			<MapView>
				<MapGeofence
					shape={{
						type: 'polygon',
						coordinates: [
							[0, 0],
							[1, 0],
							[1, 1],
							[0, 0],
						],
					}}
				/>
			</MapView>,
		)

		await waitFor(() => expect(bySlot(container, 'map')).toHaveAttribute('data-ready', ''))
	})

	it('cleans up its source and layers on unmount', async () => {
		const { container, unmount } = renderUI(
			<MapView>
				<MapGeofence shape={{ type: 'circle', center: [0, 0], radiusMeters: 200 }} />
			</MapView>,
		)

		await waitFor(() => expect(bySlot(container, 'map')).toHaveAttribute('data-ready', ''))

		expect(() => unmount()).not.toThrow()
	})

	it('honors custom color, fill opacity, stroke color, and stroke width on mount', async () => {
		// Initial-mount paint paths read these props from `mountPropsRef` and
		// also run through the prop-sync effect's `getLayer`/`setPaintProperty`
		// branches once.
		const { container } = renderUI(
			<MapView>
				<MapGeofence
					shape={{ type: 'circle', center: [0, 0], radiusMeters: 200 }}
					color="#ff0000"
					fillOpacity={0.5}
					strokeColor="#00ff00"
					strokeWidth={4}
				/>
			</MapView>,
		)

		await waitFor(() => expect(bySlot(container, 'map')).toHaveAttribute('data-ready', ''))
	})
})
