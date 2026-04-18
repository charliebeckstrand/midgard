'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Card } from '../../components/card'
import {
	Inspector,
	InspectorActions,
	InspectorBody,
	InspectorContent,
	InspectorDescription,
	InspectorHeader,
	InspectorTitle,
} from '../../components/inspector'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'
export const meta = { category: 'Overlay' }

function InspectorShell({
	open,
	onOpenChange,
	side = 'left',
	size = 'md',
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	side?: 'left' | 'right'
	size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
	return (
		<Card bg="none" p={0}>
			<InspectorContent side={side} className="h-72">
				{side === 'left' && (
					<Inspector open={open} onOpenChange={onOpenChange} side="left" size={size}>
						<InspectorHeader>
							<Stack gap={0}>
								<InspectorTitle>Load #4821</InspectorTitle>
								<InspectorDescription>Tendered to carrier Acme Freight.</InspectorDescription>
							</Stack>
						</InspectorHeader>
						<InspectorBody>
							<Text variant="muted">Pickup Chicago, IL → Delivery Dallas, TX.</Text>
						</InspectorBody>
						<InspectorActions>
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								Close
							</Button>
						</InspectorActions>
					</Inspector>
				)}
				<div className="flex-1 p-4 text-sm text-zinc-500">
					<Text variant="muted">
						Main content area. The inspector pushes this region instead of overlaying it.
					</Text>
				</div>
				{side === 'right' && (
					<Inspector open={open} onOpenChange={onOpenChange} side="right" size={size}>
						<InspectorHeader>
							<Stack gap={0}>
								<InspectorTitle>Load #4821</InspectorTitle>
								<InspectorDescription>Tendered to carrier Acme Freight.</InspectorDescription>
							</Stack>
						</InspectorHeader>
						<InspectorBody>
							<Text variant="muted">Pickup Chicago, IL → Delivery Dallas, TX.</Text>
						</InspectorBody>
						<InspectorActions>
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								Close
							</Button>
						</InspectorActions>
					</Inspector>
				)}
			</InspectorContent>
		</Card>
	)
}

export default function InspectorDemo() {
	const [left, setLeft] = useState(false)
	const [right, setRight] = useState(true)

	return (
		<Stack gap={6}>
			<Example
				title="Default"
				code={code`
				import { useState } from 'react'
				import { Button } from 'ui/button'
				import { 
					Inspector, 
					InspectorContent, 
					InspectorHeader, 
					InspectorTitle, 
					InspectorDescription, 
					InspectorBody, 
					InspectorActions 
				} from 'ui/inspector'

				const [open, setOpen] = useState(false)

				<Inspector open={open} onOpenChange={setOpen}>
					<InspectorHeader>
						<Stack gap={0}>
							<InspectorTitle>Load #4821</InspectorTitle>
							<InspectorDescription>Tendered to carrier Acme Freight.</InspectorDescription>
						</Stack>
					</InspectorHeader>
					<InspectorBody>
						<Text variant="muted">Pickup Chicago, IL → Delivery Dallas, TX.</Text>
					</InspectorBody>
					<InspectorActions>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Close
						</Button>
					</InspectorActions>
				</Inspector>
			`}
			>
				<Stack gap={3}>
					<Button onClick={() => setLeft((v) => !v)}>{left ? 'Close' : 'Open'}</Button>
					<InspectorShell open={left} onOpenChange={setLeft} side="left" size="md" />
				</Stack>
			</Example>

			<Example
				title="Right"
				code={code`
				import { useState } from 'react'
				import { Button } from 'ui/button'
				import { 
					Inspector, 
					InspectorContent, 
					InspectorHeader, 
					InspectorTitle, 
					InspectorDescription, 
					InspectorBody, 
					InspectorActions 
				} from 'ui/inspector'

				const [open, setOpen] = useState(false)

				<Inspector open={open} onOpenChange={setOpen} side="left">
					<InspectorHeader>
						<Stack gap={0}>
							<InspectorTitle>Load #4821</InspectorTitle>
							<InspectorDescription>Tendered to carrier Acme Freight.</InspectorDescription>
						</Stack>
					</InspectorHeader>
					<InspectorBody>
						<Text variant="muted">Pickup Chicago, IL → Delivery Dallas, TX.</Text>
					</InspectorBody>
					<InspectorActions>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Close
						</Button>
					</InspectorActions>
				</Inspector>
			`}
			>
				<Stack gap={3}>
					<Button onClick={() => setRight((v) => !v)}>{right ? 'Close' : 'Open'}</Button>
					<InspectorShell open={right} onOpenChange={setRight} side="right" size="md" />
				</Stack>
			</Example>
		</Stack>
	)
}
