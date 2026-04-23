import { describe, expect, it, vi } from 'vitest'
import {
	MapGeofence,
	MapMarker,
	MapRoute,
	MapShipment,
	Map as MapView,
	type RouteData,
	type ShipmentData,
} from '../../components/map'
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
	it('renders with data-slot="map"', () => {
		const { container } = renderUI(<MapView />)

		const el = bySlot(container, 'map')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<MapView className="custom" />)

		expect(bySlot(container, 'map')?.className).toContain('custom')
	})

	it('flags itself ready once the underlying map loads', async () => {
		const { container } = renderUI(<MapView />)

		await waitFor(() => expect(bySlot(container, 'map')).toHaveAttribute('data-ready', 'true'))
	})

	it('mounts children only after the map is ready', async () => {
		const { container } = renderUI(
			<MapView>
				<MapMarker position={[0, 0]} />
			</MapView>,
		)

		await waitFor(() => expect(allBySlot(container, 'map-marker').length).toBe(1))
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

	it('hides stop markers when showStops is false', async () => {
		const { container } = renderUI(
			<MapView>
				<MapRoute data={route} showStops={false} />
			</MapView>,
		)

		// Wait a tick for the map to load.
		await waitFor(() => expect(bySlot(container, 'map')).toHaveAttribute('data-ready', 'true'))

		expect(allBySlot(container, 'map-marker').length).toBe(0)
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
				<MapGeofence shape={{ kind: 'circle', center: [0, 0], radiusMeters: 500 }} />
			</MapView>,
		)

		await waitFor(() => expect(bySlot(container, 'map')).toHaveAttribute('data-ready', 'true'))
	})
})
