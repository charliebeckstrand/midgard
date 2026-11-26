import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { DashboardLayout } from 'ui/layouts'
import { Select, SelectLabel, SelectOption } from 'ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { type OrderStatus, orderStatuses, orders } from '../../../data/commerce.ts'

const statuses = ['completed', 'processing', 'pending'] as const

// `filters` sits beside the main column in a wide frame, and behind a
// Filters button in a narrow one. Drag the end border of the frame to see
// the change. The layout renders the filters in one of the two places.
export default function FilterRail() {
	const [status, setStatus] = useState<OrderStatus | null>(null)

	const shown = status ? orders.filter((order) => order.status === status) : orders

	return (
		<DashboardLayout
			className="p-4"
			filters={
				<Field>
					<Label>Status</Label>
					<Select
						placeholder="All statuses"
						value={status}
						onValueChange={setStatus}
						displayValue={(value: OrderStatus) => orderStatuses[value]}
					>
						{statuses.map((option) => (
							<SelectOption key={option} value={option}>
								<SelectLabel>{orderStatuses[option]}</SelectLabel>
							</SelectOption>
						))}
					</Select>
				</Field>
			}
		>
			<Table aria-label="Orders">
				<TableHead>
					<TableRow>
						<TableHeader>Order</TableHeader>
						<TableHeader>Customer</TableHeader>
						<TableHeader>Status</TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					{shown.map((order) => (
						<TableRow key={order.id}>
							<TableCell>{order.id}</TableCell>
							<TableCell>{order.customer}</TableCell>
							<TableCell>{orderStatuses[order.status]}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</DashboardLayout>
	)
}
