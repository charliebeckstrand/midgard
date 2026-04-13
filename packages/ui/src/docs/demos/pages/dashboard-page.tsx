'use client'

import { Search } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/card'
import { Grid } from '../../../components/grid'
import { Heading } from '../../../components/heading'
import { Icon } from '../../../components/icon'
import { Input } from '../../../components/input'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { Sizer } from '../../../components/sizer'
import { Spacer } from '../../../components/spacer'
import { Stack } from '../../../components/stack'
import { Stat, StatDelta, StatLabel, StatValue } from '../../../components/stat'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../../components/table'
import { DashboardPage } from '../../../pages'
import { Example } from '../../components/example'

export const meta = { category: 'Pages' }

const stats = [
	{ label: 'Total revenue', value: '$45,231', delta: '+20.1%', trend: 'up' as const },
	{ label: 'Subscriptions', value: '2,350', delta: '+12.5%', trend: 'up' as const },
	{ label: 'Active users', value: '1,247', delta: '+3.2%', trend: 'up' as const },
	{ label: 'Churn rate', value: '2.4%', delta: '-0.5%', trend: 'down' as const },
]

const orders = [
	{ id: 'ORD-7291', customer: 'Olivia Martin', status: 'Completed', amount: '$1,999.00' },
	{ id: 'ORD-7292', customer: 'Jackson Lee', status: 'Processing', amount: '$39.00' },
	{ id: 'ORD-7293', customer: 'Isabella Nguyen', status: 'Completed', amount: '$299.00' },
	{ id: 'ORD-7294', customer: 'William Kim', status: 'Pending', amount: '$99.00' },
	{ id: 'ORD-7295', customer: 'Sofia Davis', status: 'Completed', amount: '$149.00' },
]

function Filters() {
	return (
		<Stack direction="row" align="end" gap={4} wrap>
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

			<Select placeholder="All categories" displayValue={(v: string) => v}>
				<SelectOption value="Electronics">
					<SelectLabel>Electronics</SelectLabel>
				</SelectOption>
				<SelectOption value="Clothing">
					<SelectLabel>Clothing</SelectLabel>
				</SelectOption>
				<SelectOption value="Books">
					<SelectLabel>Books</SelectLabel>
				</SelectOption>
			</Select>
		</Stack>
	)
}

export default function DashboardPageDemo() {
	return (
		<Example>
			<DashboardPage heading={<Heading>Dashboard</Heading>} filters={<Filters />}>
				<Stack gap={6}>
					<Grid columns={{ initial: 1, sm: 2, lg: 4 }} gap={4}>
						{stats.map((stat) => (
							<Card key={stat.label}>
								<CardBody>
									<Stat>
										<StatLabel>{stat.label}</StatLabel>
										<StatValue>{stat.value}</StatValue>
										<StatDelta trend={stat.trend}>{stat.delta}</StatDelta>
									</Stat>
								</CardBody>
							</Card>
						))}
					</Grid>

					<Card>
						<CardHeader className="flex items-center gap-4">
							<CardTitle>Recent orders</CardTitle>
							<Spacer />
							<Sizer size="xs">
								<Input placeholder="Search orders" prefix={<Icon icon={<Search />} />} />
							</Sizer>
						</CardHeader>
						<CardBody>
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
						</CardBody>
					</Card>
				</Stack>
			</DashboardPage>
		</Example>
	)
}
