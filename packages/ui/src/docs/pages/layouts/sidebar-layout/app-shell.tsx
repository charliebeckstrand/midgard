import { Inbox, Plus, Settings, Users } from 'lucide-react'
import { Button } from 'ui/button'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { SidebarLayout, SidebarLayoutBody, SidebarLayoutHeader } from 'ui/layouts'
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

// The sidebar of an example is a second navigation landmark on the page, so it
// takes a name of its own.
const sidebar = (
	<Sidebar aria-label="Acme Inc.">
		<SidebarHeader>
			<Heading level={3}>Acme Inc.</Heading>
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

// The sidebar is inline in a wide frame and in a drawer in a narrow one. Drag
// the end border of the frame to see the change. `actions` shows in the
// header inline, and in the navbar of the drawer layout.
export default function AppShell() {
	return (
		<SidebarLayout
			sidebar={sidebar}
			actions={<Button prefix={<Icon icon={<Plus />} />}>New order</Button>}
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
							<TableHeader>Status</TableHeader>
						</TableRow>
					</TableHead>
					<TableBody>
						{orders.map((order) => (
							<TableRow key={order.id}>
								<TableCell className="whitespace-nowrap">{order.id}</TableCell>
								<TableCell>{order.customer}</TableCell>
								<TableCell>{orderStatuses[order.status]}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</SidebarLayoutBody>
		</SidebarLayout>
	)
}
