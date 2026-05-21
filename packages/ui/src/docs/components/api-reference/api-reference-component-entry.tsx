'use client'

import { Code } from '../../../components/code'
import { Heading } from '../../../components/heading'
import { Text } from '../../../components/text'
import type { ComponentApi } from '../../component-api'
import { PropRowsTable } from './api-reference-prop-rows-table'

export function ComponentEntry({ entry }: { entry: ComponentApi }) {
	const visibleProps = entry.props.filter((p) => p.type !== 'never')

	const events = visibleProps
		.filter((p) => /^on[A-Z]/.test(p.name))
		.sort((a, b) => a.name.localeCompare(b.name))

	const props = visibleProps
		.filter((p) => !/^on[A-Z]/.test(p.name))
		.sort((a, b) => a.name.localeCompare(b.name))

	const passThrough = entry.passThrough ?? []

	return (
		<div className="space-y-4">
			{visibleProps.length === 0 ? (
				<Text variant="muted">This component accepts no explicit props.</Text>
			) : (
				<div className="space-y-6">
					{props.length > 0 && (
						<div className="space-y-4">
							<Heading level={4}>Props</Heading>
							<PropRowsTable rows={props} />
						</div>
					)}
					{events.length > 0 && (
						<div className="space-y-4">
							<Heading level={4}>Events</Heading>
							<PropRowsTable rows={events} />
						</div>
					)}
				</div>
			)}
			{passThrough.length > 0 && (
				<div className="flex flex-wrap items-center gap-sm text-sm text-zinc-600 dark:text-zinc-400">
					<span>Also accepts all</span>
					{passThrough.map((pt, i) => (
						<span key={pt.element} className="flex items-center gap-sm">
							<Code className="font-mono dark:text-white">{`<${pt.element}>`}</Code>
							{i < passThrough.length - 1 && <span>,</span>}
						</span>
					))}
					<span>HTML attributes.</span>
				</div>
			)}
		</div>
	)
}
