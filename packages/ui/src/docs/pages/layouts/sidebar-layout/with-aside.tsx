import { Inbox, Settings, Users } from 'lucide-react'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/description-list'
import { Heading } from 'ui/heading'
import { SidebarLayout, SidebarLayoutBody, SidebarLayoutHeader } from 'ui/layouts'
import { useIntl } from 'ui/primitives/intl'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from 'ui/sidebar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { orderStatuses, orders } from '../../../data/commerce.ts'

const navItems = [
	{ id: 'orders', icon: <Inbox />, label: 'Orders', current: true },
	{ id: 'customers', icon: <Users />, label: 'Customers' },
	{ id: 'settings', icon: <Settings />, label: 'Settings' },
]

const usd = { style: 'currency', currency: 'USD' } as const

const sidebar = (
	<Sidebar aria-label="Acme Store">
		<SidebarHeader>
			<Heading level={3}>Acme Store</Heading>
		</SidebarHeader>
		<SidebarBody>
			<SidebarSection>
				{navItems.map((item) => (
					<SidebarItem key={item.id} icon={item.icon} current={item.current}>
						<SidebarLabel>{item.label}</SidebarLabel>
					</SidebarItem>
				))}
			</SidebarSection>
		</SidebarBody>
	</Sidebar>
)

// In a wide frame, `aside` shows the selected order on the end edge, and
// `stickyHeader` keeps the header at the top as the orders scroll. In a narrow
// frame, the aside does not show.
export default function WithAside() {
	const intl = useIntl()

	const [selected] = orders

	return (
		<SidebarLayout
			sidebar={sidebar}
			stickyHeader
			aside={
				selected && (
					<div className="p-4">
						<Heading level={3}>{selected.id}</Heading>
						<DescriptionList>
							<DescriptionTerm>Customer</DescriptionTerm>
							<DescriptionDetails>{selected.customer}</DescriptionDetails>
							<DescriptionTerm>Status</DescriptionTerm>
							<DescriptionDetails>{orderStatuses[selected.status]}</DescriptionDetails>
							<DescriptionTerm>Amount</DescriptionTerm>
							<DescriptionDetails>{intl.formatNumber(selected.amount, usd)}</DescriptionDetails>
						</DescriptionList>
					</div>
				)
			}
		>
			<SidebarLayoutHeader>
				<Heading level={2}>Orders</Heading>
			</SidebarLayoutHeader>
			<SidebarLayoutBody>
				<Table aria-label="Orders">
					<TableHead>
						<TableRow>
							<TableHeader>Order</TableHeader>
							<TableHeader>Customer</TableHeader>
							<TableHeader className="text-end">Amount</TableHeader>
						</TableRow>
					</TableHead>
					<TableBody>
						{orders.map((order) => (
							<TableRow key={order.id}>
								<TableCell className="whitespace-nowrap">{order.id}</TableCell>
								<TableCell>{order.customer}</TableCell>
								<TableCell className="text-end">{intl.formatNumber(order.amount, usd)}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</SidebarLayoutBody>
		</SidebarLayout>
	)
}
