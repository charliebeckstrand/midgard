'use client'

import { Activity, Inbox, Settings, Users } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/button'
import { Field, Label } from '../../../components/fieldset'
import { Filters, FiltersClear, FiltersField, useFilters } from '../../../components/filters'
import { Heading } from '../../../components/heading'
import { Listbox, ListboxLabel, ListboxOption } from '../../../components/listbox'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from '../../../components/sidebar'
import { Stack } from '../../../components/stack'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../../components/table'
import { SidebarLayout, SidebarLayoutBody, SidebarLayoutHeader } from '../../../layouts'
import { Density, type DensityLevel } from '../../../providers/density'
import { Example } from '../../components/example'

export const meta = { category: 'Pages' }

const navItems = [
	{ icon: <Inbox />, label: 'Inbox', current: true },
	{ icon: <Users />, label: 'Customers' },
	{ icon: <Activity />, label: 'Activity' },
	{ icon: <Settings />, label: 'Settings' },
]

const orders = [
	{ id: 'ORD-7291', customer: 'Olivia Martin', status: 'Completed', amount: '$1,999.00' },
	{ id: 'ORD-7292', customer: 'Jackson Lee', status: 'Processing', amount: '$39.00' },
	{ id: 'ORD-7293', customer: 'Isabella Nguyen', status: 'Completed', amount: '$299.00' },
	{ id: 'ORD-7294', customer: 'William Kim', status: 'Pending', amount: '$99.00' },
	{ id: 'ORD-7295', customer: 'Sofia Davis', status: 'Completed', amount: '$149.00' },
	{ id: 'ORD-7296', customer: 'Ethan Brown', status: 'Processing', amount: '$59.00' },
]

const levels: { value: DensityLevel; label: string }[] = [
	{ value: 'comfortable', label: 'Comfortable' },
	{ value: 'snug', label: 'Snug' },
	{ value: 'compact', label: 'Compact' },
]

type OrderFilters = {
	status: string | undefined
	customer: string | undefined
}

function ResetButton() {
	const { activeCount } = useFilters()

	if (activeCount === 0) return null

	return (
		<FiltersClear>
			<Button variant="soft" color="red">
				Reset
			</Button>
		</FiltersClear>
	)
}

function OrdersFilters() {
	const [filters, setFilters] = useState<OrderFilters>({
		status: undefined,
		customer: undefined,
	})

	return (
		<Filters value={filters} clear={<ResetButton />} onValueChange={setFilters}>
			<FiltersField name="status">
				<Select placeholder="All statuses" displayValue={(v: string) => v}>
					<SelectOption value="Completed">
						<SelectLabel>Completed</SelectLabel>
					</SelectOption>
					<SelectOption value="Processing">
						<SelectLabel>Processing</SelectLabel>
					</SelectOption>
					<SelectOption value="Pending">
						<SelectLabel>Pending</SelectLabel>
					</SelectOption>
				</Select>
			</FiltersField>
			<FiltersField name="customer">
				<Select placeholder="All customers" displayValue={(v: string) => v}>
					{orders.map((o) => (
						<SelectOption key={o.customer} value={o.customer}>
							<SelectLabel>{o.customer}</SelectLabel>
						</SelectOption>
					))}
				</Select>
			</FiltersField>
		</Filters>
	)
}

function DensityPicker({
	density,
	onDensityChange,
}: {
	density: DensityLevel
	onDensityChange: (next: DensityLevel) => void
}) {
	return (
		<Field>
			<Label>Density</Label>
			<Listbox<DensityLevel>
				value={density}
				onValueChange={(v) => v && onDensityChange(v)}
				displayValue={(v) => levels.find((t) => t.value === v)?.label ?? v}
				placeholder="Select density"
			>
				{levels.map((level) => (
					<ListboxOption key={level.value} value={level.value}>
						<ListboxLabel>{level.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	)
}

export default function SidebarPageDemo() {
	const [density, setDensity] = useState<DensityLevel>('snug')

	const sidebar = (
		<Sidebar>
			<SidebarHeader>
				<Heading level={3}>Acme Inc.</Heading>
			</SidebarHeader>
			<SidebarBody>
				<SidebarSection>
					{navItems.map((item) => (
						<SidebarItem key={item.label} icon={item.icon} current={item.current}>
							<SidebarLabel>{item.label}</SidebarLabel>
						</SidebarItem>
					))}
				</SidebarSection>
			</SidebarBody>
		</Sidebar>
	)

	return (
		<Example>
			<Stack gap="md">
				{/* Picker sits outside Density so it stays a stable size. */}
				<DensityPicker density={density} onDensityChange={setDensity} />

				<Density density={density}>
					<SidebarLayout sidebar={sidebar}>
						<SidebarLayoutHeader>
							<Heading level={3}>Orders</Heading>
						</SidebarLayoutHeader>
						<SidebarLayoutBody>
							<Stack>
								<OrdersFilters />
								<Table>
									<TableHead>
										<TableRow>
											<TableHeader>Order</TableHeader>
											<TableHeader>Customer</TableHeader>
											<TableHeader>Status</TableHeader>
											<TableHeader className="text-right">Amount</TableHeader>
										</TableRow>
									</TableHead>
									<TableBody>
										{orders.map((order) => (
											<TableRow key={order.id}>
												<TableCell className="font-medium">{order.id}</TableCell>
												<TableCell>{order.customer}</TableCell>
												<TableCell>{order.status}</TableCell>
												<TableCell className="text-right">{order.amount}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</Stack>
						</SidebarLayoutBody>
					</SidebarLayout>
				</Density>
			</Stack>
		</Example>
	)
}
