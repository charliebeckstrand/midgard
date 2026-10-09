import { ArrowDown, ArrowUp } from 'lucide-react'
import { Card, CardBody } from 'ui/card'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { Stat, StatDelta, StatLabel, StatValue } from 'ui/stat'

const metrics = [
	{ label: 'Revenue', value: '$12,345', change: '12.5%', trend: 'up' },
	{ label: 'Active users', value: '8,421', change: '3.1%', trend: 'up' },
	{ label: 'Churn', value: '2.4%', change: '0.8%', trend: 'down' },
] as const

export default function DashboardGrid() {
	return (
		<Flex gap="md" wrap>
			{metrics.map((metric) => (
				<Card key={metric.label} className="flex-auto">
					<CardBody>
						<Stat>
							<StatLabel>{metric.label}</StatLabel>
							<StatValue>{metric.value}</StatValue>
							<StatDelta trend={metric.trend}>
								<Icon icon={metric.trend === 'up' ? <ArrowUp /> : <ArrowDown />} size="xs" />
								{metric.change}
							</StatDelta>
						</Stat>
					</CardBody>
				</Card>
			))}
		</Flex>
	)
}
