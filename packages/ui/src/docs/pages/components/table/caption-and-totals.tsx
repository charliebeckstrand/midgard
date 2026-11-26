import { useIntl } from 'ui/primitives/intl'
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFoot,
	TableHead,
	TableHeader,
	TableRow,
} from 'ui/table'
import { orders } from '../../../data/commerce.ts'

const usd = { style: 'currency', currency: 'USD' } as const

const total = orders.reduce((sum, order) => sum + order.amount, 0)

// The caption names the table. The foot holds the total, and takes no stripe
// and no hover wash.
export default function CaptionAndTotals() {
	const intl = useIntl()

	return (
		<Table striped>
			<TableCaption>Recent orders</TableCaption>
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
						<TableCell>{order.id}</TableCell>
						<TableCell>{order.customer}</TableCell>
						<TableCell className="text-end">{intl.formatNumber(order.amount, usd)}</TableCell>
					</TableRow>
				))}
			</TableBody>
			<TableFoot>
				<TableRow>
					<TableCell colSpan={2}>Total</TableCell>
					<TableCell className="text-end">{intl.formatNumber(total, usd)}</TableCell>
				</TableRow>
			</TableFoot>
		</Table>
	)
}
