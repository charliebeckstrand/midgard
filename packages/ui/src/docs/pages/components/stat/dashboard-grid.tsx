import { ArrowDown, ArrowUp } from 'lucide-react'
import { Card, CardBody } from 'ui/card'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { useIntl } from 'ui/primitives/intl'
import { Stat, StatDelta, StatLabel, StatValue } from 'ui/stat'

// A change shows its sign, and no sign when it is zero.
const delta = { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 1 } as const

const metrics = [
	{
		label: 'Revenue',
		value: 12345,
		format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
		change: 0.125,
		trend: 'up',
	},
	{ label: 'Active users', value: 8421, format: {}, change: 0.031, trend: 'up' },
	{
		label: 'Churn',
		value: 0.024,
		format: { style: 'percent', maximumFractionDigits: 1 },
		change: -0.008,
		trend: 'down',
	},
] as const

export default function DashboardGrid() {
	const intl = useIntl()

	return (
		<Flex gap="md" wrap>
			{metrics.map((metric) => (
				<Card key={metric.label} className="flex-auto">
					<CardBody>
						<Stat>
							<StatLabel>{metric.label}</StatLabel>
							<StatValue>{intl.formatNumber(metric.value, metric.format)}</StatValue>
							<StatDelta trend={metric.trend}>
								<Icon icon={metric.trend === 'up' ? <ArrowUp /> : <ArrowDown />} size="xs" />
								{intl.formatNumber(metric.change, delta)}
							</StatDelta>
						</Stat>
					</CardBody>
				</Card>
			))}
		</Flex>
	)
}
