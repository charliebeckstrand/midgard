'use client'

import { Heading } from '../../../components/heading'
import { Text } from '../../../components/text'
import type { ComponentApi, PropDef } from '../../api-reference/types'
import { PassThroughNote } from './pass-through'
import { PropsTable } from './props-table'

/** React-style event handlers — `onClick`, `onChange`, … */
const EVENT_PROP = /^on[A-Z]/

/**
 * Split into props and events, sorted within each bucket. `never`-typed
 * entries are dropped — they're the trace of a discriminated-union arm
 * that rules a key out.
 */
function partition(props: readonly PropDef[]): { props: PropDef[]; events: PropDef[] } {
	const out = { props: [] as PropDef[], events: [] as PropDef[] }

	for (const p of props) {
		if (p.type === 'never') continue
		;(EVENT_PROP.test(p.name) ? out.events : out.props).push(p)
	}

	out.props.sort((a, b) => a.name.localeCompare(b.name))
	out.events.sort((a, b) => a.name.localeCompare(b.name))

	return out
}

export function ComponentEntry({ entry }: { entry: ComponentApi }) {
	const { props, events } = partition(entry.props)
	const passThrough = entry.passThrough ?? []
	const hasAny = props.length + events.length > 0

	return (
		<div className="space-y-4">
			{hasAny ? (
				<div className="space-y-6">
					{props.length > 0 && <Section title="Props" rows={props} />}
					{events.length > 0 && <Section title="Events" rows={events} />}
				</div>
			) : (
				<Text variant="muted">This component accepts no explicit props.</Text>
			)}
			<PassThroughNote entries={passThrough} />
		</div>
	)
}

function Section({ title, rows }: { title: string; rows: PropDef[] }) {
	return (
		<div className="space-y-4">
			<Heading level={3}>{title}</Heading>
			<PropsTable rows={rows} />
		</div>
	)
}
