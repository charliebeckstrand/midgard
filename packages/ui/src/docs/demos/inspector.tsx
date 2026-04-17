'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import {
	Inspector,
	InspectorActions,
	InspectorBody,
	InspectorClose,
	InspectorDescription,
	InspectorTitle,
} from '../../components/inspector'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Overlay' }

function InspectorShell({
	open,
	onOpenChange,
	side = 'right',
	size = 'md',
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	side?: 'right' | 'left'
	size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
	return (
		<div className="flex h-72 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
			{side === 'left' && (
				<Inspector open={open} onOpenChange={onOpenChange} side="left" size={size}>
					<InspectorTitle>Load #4821</InspectorTitle>
					<InspectorDescription>Tendered to carrier Acme Freight.</InspectorDescription>
					<InspectorBody>
						<p className="text-sm">Pickup Chicago, IL → Delivery Dallas, TX.</p>
					</InspectorBody>
					<InspectorActions>
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Close
						</Button>
					</InspectorActions>
					<InspectorClose />
				</Inspector>
			)}
			<div className="flex-1 p-4 text-sm text-zinc-500">
				<p>Main content area. The inspector pushes this region instead of overlaying it.</p>
			</div>
			{side === 'right' && (
				<Inspector open={open} onOpenChange={onOpenChange} side="right" size={size}>
					<InspectorTitle>Load #4821</InspectorTitle>
					<InspectorDescription>Tendered to carrier Acme Freight.</InspectorDescription>
					<InspectorBody>
						<p className="text-sm">Pickup Chicago, IL → Delivery Dallas, TX.</p>
					</InspectorBody>
					<InspectorActions>
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Close
						</Button>
					</InspectorActions>
					<InspectorClose />
				</Inspector>
			)}
		</div>
	)
}

export default function InspectorDemo() {
	const [right, setRight] = useState(true)
	const [left, setLeft] = useState(false)
	const [small, setSmall] = useState(true)
	const [large, setLarge] = useState(true)

	return (
		<Stack gap={6}>
			<Example title="Default (right)">
				<Stack gap={3}>
					<Button onClick={() => setRight((v) => !v)}>{right ? 'Close' : 'Open'}</Button>
					<InspectorShell open={right} onOpenChange={setRight} side="right" size="md" />
				</Stack>
			</Example>

			<Example title="Left side">
				<Stack gap={3}>
					<Button onClick={() => setLeft((v) => !v)}>{left ? 'Close' : 'Open'}</Button>
					<InspectorShell open={left} onOpenChange={setLeft} side="left" size="md" />
				</Stack>
			</Example>

			<Example title="Small">
				<Stack gap={3}>
					<Button onClick={() => setSmall((v) => !v)}>{small ? 'Close' : 'Open'}</Button>
					<InspectorShell open={small} onOpenChange={setSmall} side="right" size="sm" />
				</Stack>
			</Example>

			<Example title="Large">
				<Stack gap={3}>
					<Button onClick={() => setLarge((v) => !v)}>{large ? 'Close' : 'Open'}</Button>
					<InspectorShell open={large} onOpenChange={setLarge} side="right" size="lg" />
				</Stack>
			</Example>
		</Stack>
	)
}
