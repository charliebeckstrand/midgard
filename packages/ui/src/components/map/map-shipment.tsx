'use client'

import { Truck } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '../dialog'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '../dl'
import { Icon } from '../icon'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../tabs'
import { Text } from '../text'
import { MapMarker } from './map-marker'
import { MapShipmentChat } from './map-shipment-chat'
import type { ShipmentData } from './types'

export type MapShipmentProps = {
	data: ShipmentData
	/** Called when the user sends a chat message. If omitted and `data.messages` is empty, the chat tab is hidden. */
	onSendMessage?: (body: string) => unknown | Promise<unknown>
	/** Fires before the default Dialog opens. Return `false` to prevent the default. */
	onSelect?: (shipment: ShipmentData) => boolean | undefined
}

export function MapShipment({ data, onSendMessage, onSelect }: MapShipmentProps) {
	const [open, setOpen] = useState(false)

	const hasChat = onSendMessage !== undefined || (data.messages && data.messages.length > 0)

	return (
		<>
			<MapMarker
				position={data.position}
				onClick={() => {
					if (onSelect?.(data) === false) return

					setOpen(true)
				}}
			>
				<ShipmentPin label={data.label} />
			</MapMarker>
			<Dialog open={open} onOpenChange={setOpen} size="md">
				<DialogTitle>{data.label}</DialogTitle>
				<DialogBody>
					{hasChat ? (
						<Tabs defaultValue="info">
							<TabList>
								<Tab value="info">Info</Tab>
								<Tab value="chat">Chat</Tab>
							</TabList>
							<TabContents>
								<TabContent value="info">
									<ShipmentInfo data={data} />
								</TabContent>
								<TabContent value="chat">
									<MapShipmentChat messages={data.messages ?? []} onSend={onSendMessage} />
								</TabContent>
							</TabContents>
						</Tabs>
					) : (
						<ShipmentInfo data={data} />
					)}
					<DialogActions>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</DialogActions>
				</DialogBody>
			</Dialog>
		</>
	)
}

function ShipmentPin({ label }: { label: string }) {
	return (
		<Button title={label} className="rounded-full hover:scale-110 transition cursor-pointer">
			<Icon icon={<Truck />} size="sm" />
		</Button>
	)
}

function ShipmentInfo({ data }: { data: ShipmentData }) {
	const rows: Array<{ label: string; value: string }> = []

	if (data.status) rows.push({ label: 'Status', value: data.status })

	if (data.eta) {
		const eta = typeof data.eta === 'string' ? new Date(data.eta) : data.eta

		rows.push({
			label: 'ETA',
			value: Number.isNaN(eta.getTime())
				? String(data.eta)
				: eta.toLocaleString(undefined, {
						month: 'short',
						day: 'numeric',
						hour: 'numeric',
						minute: '2-digit',
					}),
		})
	}

	if (data.info) rows.push(...data.info)

	if (rows.length === 0) {
		return <Text variant="muted">No shipment details available.</Text>
	}

	return (
		<DescriptionList>
			{rows.map((row) => (
				<div key={row.label} className="contents">
					<DescriptionTerm>{row.label}</DescriptionTerm>
					<DescriptionDetails>{row.value}</DescriptionDetails>
				</div>
			))}
		</DescriptionList>
	)
}
