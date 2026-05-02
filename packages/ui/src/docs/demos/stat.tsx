import { ArrowDown, ArrowUp } from 'lucide-react'
import { Card, CardBody } from '../../components/card'
import { Flex } from '../../components/flex'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
import { Stat, StatDelta, StatDescription, StatLabel, StatValue } from '../../components/stat'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export default function StatDemo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<Stat>
					<StatLabel>Monthly recurring revenue</StatLabel>
					<StatValue>$12,345</StatValue>
				</Stat>
			</Example>

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

			<Example title="Trends">
				<Stack gap="sm">
					<StatDelta trend="up">
						<Icon icon={<ArrowUp />} size="xs" />
						12.5%
					</StatDelta>
					<StatDelta trend="down">
						<Icon icon={<ArrowDown />} size="xs" />
						4.2%
					</StatDelta>
					<StatDelta trend="neutral">0.0%</StatDelta>
				</Stack>
			</Example>

			<Example title="Value sizes">
				<Flex wrap align="end" gap="xl">
					{(['sm', 'md', 'lg'] as const).map((s) => (
						<Stat key={s}>
							<StatLabel>Size {s}</StatLabel>
							<StatValue size={s}>$1,234</StatValue>
						</Stat>
					))}
				</Flex>
			</Example>

			<Example title="Dashboard grid">
				<div className="grid gap-4 sm:grid-cols-3">
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
		</Stack>
	)
}
