import { Activity, Inbox, Pencil, Settings, Trash, Users } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/button'
import { Filters, FiltersClear, FiltersField, useFilters } from '../../../components/filters'
import { Flex } from '../../../components/flex'
import { Heading } from '../../../components/heading'
import { Icon } from '../../../components/icon'
import { SearchInput } from '../../../components/search-input'
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
import { Text } from '../../../components/text'
import { SidebarLayout, SidebarLayoutBody, SidebarLayoutHeader } from '../../../layouts'
import { type DensityLevel, DensityProvider } from '../../../providers/density'
import { DensityListbox } from '../../components/density-listbox'
import { Example } from '../../components/example'

export const meta = { category: 'Providers' }

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

type OrderFilters = {
	id: string | undefined
	status: string | undefined
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

type OrdersFiltersProps = {
	value: OrderFilters
	onValueChange: (value: OrderFilters) => void
}

function OrdersFilters({ value, onValueChange }: OrdersFiltersProps) {
	return (
		<Filters
			aria-label="Order filters"
			value={value}
			clear={<ResetButton />}
			onValueChange={onValueChange}
		>
			<FiltersField name="id">
				<SearchInput placeholder="Search by order ID" autoComplete="off" />
			</FiltersField>
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
		</Filters>
	)
}

export function Demo() {
	const [density, setDensity] = useState<DensityLevel>('snug')

	const [filters, setFilters] = useState<OrderFilters>({
		id: undefined,
		status: undefined,
	})

	const filteredOrders = orders.filter(
		(o) =>
			(!filters.id || o.id.toLowerCase().includes(filters.id.toLowerCase())) &&
			(!filters.status || o.status === filters.status),
	)

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
		<Example actions={<DensityListbox value={density} onValueChange={setDensity} />}>
			<Stack gap="md">
				<DensityProvider density={density}>
					<SidebarLayout sidebar={sidebar}>
						<SidebarLayoutHeader>
							<Heading level={1}>Orders</Heading>
						</SidebarLayoutHeader>
						<SidebarLayoutBody>
							<Stack>
								<OrdersFilters value={filters} onValueChange={setFilters} />
								{filteredOrders.length ? (
									<Table>
										<TableHead>
											<TableRow>
												<TableHeader>Order</TableHeader>
												<TableHeader>Customer</TableHeader>
												<TableHeader>Status</TableHeader>
												<TableHeader className="text-right">Amount</TableHeader>
												<TableHeader className="text-right">Actions</TableHeader>
											</TableRow>
										</TableHead>
										<TableBody>
											{filteredOrders.map((order) => (
												<TableRow key={order.id}>
													<TableCell className="font-medium">{order.id}</TableCell>
													<TableCell>{order.customer}</TableCell>
													<TableCell>{order.status}</TableCell>
													<TableCell className="text-right">{order.amount}</TableCell>
													<TableCell>
														<Flex justify="end">
															<Button
																aria-label={`Edit order ${order.id}`}
																color="blue"
																variant="bare"
															>
																<Icon icon={<Pencil />} />
															</Button>
															<Button
																aria-label={`Delete order ${order.id}`}
																color="red"
																variant="bare"
															>
																<Icon icon={<Trash />} />
															</Button>
														</Flex>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<Text variant="warning">No orders match your filters.</Text>
								)}
							</Stack>
						</SidebarLayoutBody>
					</SidebarLayout>
				</DensityProvider>
			</Stack>
		</Example>
	)
}
