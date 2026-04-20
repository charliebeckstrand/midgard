import { ShipmentTracker } from '../../components/shipment-tracker'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Shipments' }

const steps = [
	{ label: 'Ordered', timestamp: 'Mar 12, 9:12 AM' },
	{ label: 'Shipped', timestamp: 'Mar 13, 2:45 PM' },
	{ label: 'Out for delivery', timestamp: 'Mar 15, 8:03 AM' },
	{ label: 'Delivered' },
]

const delivered = steps.map((step, index) =>
	index === steps.length - 1 ? { ...step, timestamp: 'Mar 15, 11:27 AM' } : step,
)

export default function ShipmentTrackerDemo() {
	return (
		<Stack gap={6}>
			<Example
				title="In progress"
				code={code`
					import { ShipmentTracker } from 'ui/shipment-tracker'

					const steps = [
						{ label: 'Ordered', timestamp: 'Mar 12, 9:12 AM' },
						{ label: 'Shipped', timestamp: 'Mar 13, 2:45 PM' },
						{ label: 'Out for delivery', timestamp: 'Mar 15, 8:03 AM' },
						{ label: 'Delivered' },
					]

					<ShipmentTracker steps={steps} currentIndex={2} />
				`}
			>
				<ShipmentTracker steps={steps} currentIndex={2} />
			</Example>

			<Example
				title="Delivered"
				code={code`
					<ShipmentTracker steps={steps} currentIndex={3} />
				`}
			>
				<ShipmentTracker steps={delivered} currentIndex={3} />
			</Example>

			<Example
				title="Horizontal"
				code={code`
					<ShipmentTracker steps={steps} currentIndex={1} orientation="horizontal" />
				`}
			>
				<ShipmentTracker steps={steps} currentIndex={1} orientation="horizontal" />
			</Example>

			<Example
				title="With descriptions"
				code={code`
					const steps = [
						{ label: 'Ordered', timestamp: 'Mar 12, 9:12 AM', description: 'Warehouse in Phoenix, AZ' },
						{ label: 'Shipped', timestamp: 'Mar 13, 2:45 PM', description: 'Handed to carrier' },
						{ label: 'Out for delivery', timestamp: 'Mar 15, 8:03 AM', description: 'Driver en route' },
						{ label: 'Delivered' },
					]

					<ShipmentTracker steps={steps} currentIndex={2} />
				`}
			>
				<ShipmentTracker
					steps={[
						{ ...steps[0], description: 'Warehouse in Phoenix, AZ' },
						{ ...steps[1], description: 'Handed to carrier' },
						{ ...steps[2], description: 'Driver en route' },
						steps[3],
					]}
					currentIndex={2}
				/>
			</Example>
		</Stack>
	)
}
