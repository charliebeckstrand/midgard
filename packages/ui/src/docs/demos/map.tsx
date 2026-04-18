'use client'

import { useState } from 'react'
import {
	type ChatMessage,
	MapGeofence,
	MapMarker,
	MapRoute,
	MapShipment,
	Map as MapView,
	type RouteData,
} from '../../components/map'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

const route: RouteData = {
	id: 'r1',
	stops: [
		{
			id: 's1',
			name: 'Oakland Warehouse',
			position: [-122.2712, 37.8044],
			status: 'done',
			timestamp: '2026-04-17T08:00:00',
			description: 'Departed distribution center.',
		},
		{
			id: 's2',
			name: 'SF Crossdock',
			position: [-122.4194, 37.7749],
			status: 'done',
			timestamp: '2026-04-17T09:30:00',
		},
		{
			id: 's3',
			name: 'Daly City Hub',
			position: [-122.47, 37.6879],
			status: 'active',
			timestamp: '2026-04-17T11:15:00',
			description: 'Scanning freight for next leg.',
		},
		{
			id: 's4',
			name: 'San Mateo Depot',
			position: [-122.3255, 37.5629],
			status: 'pending',
		},
		{
			id: 's5',
			name: 'San Jose Hub',
			position: [-121.8863, 37.3382],
			status: 'pending',
		},
	],
}

const seedMessages: ChatMessage[] = [
	{ id: 'm1', author: 'them', body: 'Heading out now, ETA 3pm.', timestamp: '2026-04-17T11:10:00' },
	{ id: 'm2', author: 'me', body: 'Got it — door code is 4421.', timestamp: '2026-04-17T11:12:00' },
]

function Default() {
	return (
		<Example
			title="Interactive route"
			code={code`
				import { Map, MapRoute } from 'ui/map'

				<div className="h-96">
					<Map center={[-122.18, 37.57]} zoom={8.5}>
						<MapRoute data={route} />
					</Map>
				</div>
			`}
		>
			<div className="h-96">
				<MapView center={[-122.18, 37.57]} zoom={8.5}>
					<MapRoute data={route} />
				</MapView>
			</div>
		</Example>
	)
}

function Geofences() {
	return (
		<Example
			title="Geofences"
			code={code`
				import { Map, MapMarker, MapGeofence } from 'ui/map'

				<div className="h-96">
					<Map center={[-122.4194, 37.7749]} zoom={11}>
						<MapGeofence
							shape={{ kind: 'circle', center: [-122.4194, 37.7749], radiusMeters: 3000 }}
						/>
						<MapMarker position={[-122.4194, 37.7749]} />
					</Map>
				</div>
			`}
		>
			<div className="h-96">
				<MapView center={[-122.4194, 37.7749]} zoom={11}>
					<MapGeofence
						shape={{ kind: 'circle', center: [-122.4194, 37.7749], radiusMeters: 3000 }}
					/>
					<MapMarker position={[-122.4194, 37.7749]} />
				</MapView>
			</div>
		</Example>
	)
}

function Shipments() {
	const [messages, setMessages] = useState(seedMessages)

	function handleSend(body: string) {
		setMessages((prev) => [
			...prev,
			{ id: `m${prev.length + 1}`, author: 'me', body, timestamp: new Date() },
		])
	}

	return (
		<Example
			title="Shipment info"
			code={code`
				import { Map, MapShipment } from 'ui/map'

				<div className="h-96">
					<Map center={[-122.47, 37.69]} zoom={11}>
						<MapShipment
							data={{
								id: 'ship-1',
								label: 'Truck 42',
								position: [-122.47, 37.6879],
								status: 'In transit',
								eta: '2026-04-17T15:00:00',
								info: [{ label: 'Driver', value: 'J. Navarro' }],
								messages,
							}}
							onSendMessage={handleSend}
						/>
					</Map>
				</div>
			`}
		>
			<div className="h-96">
				<MapView center={[-122.47, 37.69]} zoom={11}>
					<MapShipment
						data={{
							id: 'ship-1',
							label: 'Truck 42',
							position: [-122.47, 37.6879],
							status: 'In transit',
							eta: '2026-04-17T15:00:00',
							info: [
								{ label: 'Driver', value: 'J. Navarro' },
								{ label: 'Load', value: '14 pallets' },
							],
							messages,
						}}
						onSendMessage={handleSend}
					/>
				</MapView>
			</div>
		</Example>
	)
}

function InfoOnly() {
	return (
		<Example
			title="Shipment without chat"
			code={code`
				import { Map, MapShipment } from 'ui/map'

				<div className="h-96">
					<Map center={[-122.47, 37.69]} zoom={11}>
						<MapShipment
							data={{
								id: 'ship-2',
								label: 'Truck 17',
								position: [-122.47, 37.6879],
								status: 'Loading',
								eta: '2026-04-17T16:30:00',
								info: [
									{ label: 'Driver', value: 'A. Chen' },
									{ label: 'Load', value: '8 pallets' },
								],
							}}
						/>
					</Map>
				</div>
			`}
		>
			<div className="h-96">
				<MapView center={[-122.47, 37.69]} zoom={11}>
					<MapShipment
						data={{
							id: 'ship-2',
							label: 'Truck 17',
							position: [-122.47, 37.6879],
							status: 'Loading',
							eta: '2026-04-17T16:30:00',
							info: [
								{ label: 'Driver', value: 'A. Chen' },
								{ label: 'Load', value: '8 pallets' },
							],
						}}
					/>
				</MapView>
			</div>
		</Example>
	)
}

export default function MapDemo() {
	return (
		<Stack gap={6}>
			<Default />
			<Geofences />
			<Shipments />
			<InfoOnly />
		</Stack>
	)
}
