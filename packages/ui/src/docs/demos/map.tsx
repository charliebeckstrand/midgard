'use client'

import { useState } from 'react'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import {
	type ChatMessage,
	type MapPreset,
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

const presets: { value: MapPreset; label: string }[] = [
	{ value: 'demo', label: 'MapLibre' },
	{ value: 'osm', label: 'OpenStreetMap' },
	{ value: 'positron', label: 'Carto Positron' },
	{ value: 'dark-matter', label: 'Carto Dark Matter' },
	{ value: 'satellite', label: 'Esri Satellite' },
]

function Presets() {
	const [preset, setPreset] = useState<MapPreset>('demo')

	return (
		<Example
			title="Rendering presets"
			code={code`
				import { Map, type MapPreset } from 'ui/map'

				const [preset, setPreset] = useState<MapPreset>('demo')

				<Map preset={preset} center={[-95, 33]} zoom={0} />
			`}
			actions={
				<Listbox<MapPreset>
					value={preset}
					onChange={(v) => {
						if (v) setPreset(v)
					}}
					displayValue={(v) => presets.find((p) => p.value === v)?.label ?? v}
				>
					{presets.map((p) => (
						<ListboxOption key={p.value} value={p.value}>
							<ListboxLabel>{p.label}</ListboxLabel>
						</ListboxOption>
					))}
				</Listbox>
			}
		>
			<div className="h-96">
				<MapView preset={preset} center={[-95, 33]} zoom={0} />
			</div>
		</Example>
	)
}

function InteractiveRoute() {
	return (
		<Example
			title="Interactive route"
			code={code`
				import { Map, MapRoute } from 'ui/map'

				<div className="h-96">
					<Map center={[-122.18, 37.57]} zoom={7.5}>
						<MapRoute data={route} />
					</Map>
				</div>
			`}
		>
			<div className="h-96">
				<MapView center={[-122.18, 37.65]} zoom={7.5}>
					<MapRoute data={route} />
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
			<Presets />
			<InteractiveRoute />
			<Shipments />
			<InfoOnly />
		</Stack>
	)
}
