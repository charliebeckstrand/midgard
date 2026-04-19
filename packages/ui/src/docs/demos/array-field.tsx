'use client'

import { useState } from 'react'
import { ArrayField } from '../../components/array-field'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

type Stop = { id: string; city: string }

let nextId = 4

const initialStops: Stop[] = [
	{ id: '1', city: 'Chicago, IL' },
	{ id: '2', city: 'Indianapolis, IN' },
	{ id: '3', city: 'Atlanta, GA' },
]

function Editable() {
	const [stops, setStops] = useState(initialStops)

	const update = (id: string, city: string) =>
		setStops((rows) => rows.map((row) => (row.id === id ? { ...row, city } : row)))

	return (
		<Example title="Editable">
			<Sizer>
				<ArrayField
					legend="Stops"
					items={stops}
					getKey={(s) => s.id}
					onReorder={setStops}
					onAdd={() => {
						nextId += 1

						setStops((rows) => [...rows, { id: String(nextId), city: '' }])
					}}
					onRemove={(stop) => setStops((rows) => rows.filter((row) => row.id !== stop.id))}
					addLabel="Add stop"
				>
					{(stop, { index }) => (
						<Field>
							<Label>Stop {index + 1}</Label>
							<Input
								value={stop.city}
								onChange={(e) => update(stop.id, e.target.value)}
								placeholder="City, ST"
							/>
						</Field>
					)}
				</ArrayField>
			</Sizer>
		</Example>
	)
}

function Bounded() {
	const [stops, setStops] = useState<Stop[]>([{ id: '1', city: 'Origin' }])

	return (
		<Example title="Min 1, max 3">
			<Sizer>
				<ArrayField
					legend="Locations"
					items={stops}
					getKey={(s) => s.id}
					onReorder={setStops}
					onAdd={() => {
						nextId += 1

						setStops((rows) => [...rows, { id: String(nextId), city: '' }])
					}}
					onRemove={(stop) => setStops((rows) => rows.filter((row) => row.id !== stop.id))}
					min={1}
					max={3}
				>
					{(stop, { index }) => (
						<Field>
							<Label>Location {index + 1}</Label>
							<Input
								value={stop.city}
								onChange={(e) =>
									setStops((rows) =>
										rows.map((row) =>
											row.id === stop.id ? { ...row, city: e.target.value } : row,
										),
									)
								}
							/>
						</Field>
					)}
				</ArrayField>
			</Sizer>
		</Example>
	)
}

function ReadOnly() {
	return (
		<Example title="Read-only">
			<Sizer>
				<ArrayField legend="Stops" items={initialStops} getKey={(s) => s.id}>
					{(stop) => (
						<Field>
							<Label>{stop.city}</Label>
						</Field>
					)}
				</ArrayField>
			</Sizer>
		</Example>
	)
}

function Disabled() {
	const [stops, setStops] = useState(initialStops)

	return (
		<Example title="Disabled">
			<Sizer>
				<ArrayField
					legend="Stops"
					items={stops}
					getKey={(s) => s.id}
					onReorder={setStops}
					onAdd={() => {}}
					onRemove={() => {}}
					disabled
				>
					{(stop, { index }) => (
						<Field>
							<Label>Stop {index + 1}</Label>
							<Input defaultValue={stop.city} />
						</Field>
					)}
				</ArrayField>
			</Sizer>
		</Example>
	)
}

export default function ArrayFieldDemo() {
	return (
		<Stack gap={6}>
			<Editable />
			<Bounded />
			<ReadOnly />
			<Disabled />
		</Stack>
	)
}
