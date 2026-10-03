import { ArrowDown, ArrowUp } from 'lucide-react'
import { Card, CardBody } from '../../../components/card'
import { Icon } from '../../../components/icon'
import { Stat, StatDelta, StatDescription, StatLabel, StatValue } from '../../../components/stat'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes
				of="StatDelta"
				captions={false}
				title="Delta"
				render={(props, label) => <StatDelta {...props}>{label}</StatDelta>}
			/>

			<Axes
				of="StatValue"
				captions={false}
				title="Value"
				render={(props, label) => (
					<Stat>
						<StatLabel>{label}</StatLabel>
						<StatValue {...props}>$1,234</StatValue>
					</Stat>
				)}
			/>

			<Example title="With delta and description">
				<Stat>
					<StatLabel>Monthly recurring revenue</StatLabel>
					<StatValue>$12,345</StatValue>
					<StatDelta trend="up">
						<Icon icon={<ArrowUp />} size="xs" />
						12.5%
					</StatDelta>
					<StatDescription>vs. last month</StatDescription>
				</Stat>
			</Example>

			<Example title="Dashboard grid">
				<div className="grid w-full gap-4 sm:grid-cols-3">
					<Card bg="none">
						<CardBody>
							<Stat>
								<StatLabel>Revenue</StatLabel>
								<StatValue>$12,345</StatValue>
								<StatDelta trend="up">
									<Icon icon={<ArrowUp />} size="xs" />
									12.5%
								</StatDelta>
							</Stat>
						</CardBody>
					</Card>
					<Card bg="none">
						<CardBody>
							<Stat>
								<StatLabel>Active users</StatLabel>
								<StatValue>8,421</StatValue>
								<StatDelta trend="up">
									<Icon icon={<ArrowUp />} size="xs" />
									3.1%
								</StatDelta>
							</Stat>
						</CardBody>
					</Card>
					<Card bg="none">
						<CardBody>
							<Stat>
								<StatLabel>Churn</StatLabel>
								<StatValue>2.4%</StatValue>
								<StatDelta trend="down">
									<Icon icon={<ArrowDown />} size="xs" />
									0.8%
								</StatDelta>
							</Stat>
						</CardBody>
					</Card>
				</div>
			</Example>
		</>
	)
}
