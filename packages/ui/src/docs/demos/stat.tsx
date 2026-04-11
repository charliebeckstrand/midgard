import { ArrowDown, ArrowUp } from 'lucide-react'
import { Card, CardBody } from '../../components/card'
import { Icon } from '../../components/icon'
import { Stat, StatDelta, StatDescription, StatLabel, StatValue } from '../../components/stat'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

export default function StatDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Basic"
				code={code`
					import { Stat, StatLabel, StatValue } from 'ui/stat'

					<Stat>
						<StatLabel>Monthly recurring revenue</StatLabel>
						<StatValue>$12,345</StatValue>
					</Stat>
				`}
			>
				<Stat>
					<StatLabel>Monthly recurring revenue</StatLabel>
					<StatValue>$12,345</StatValue>
				</Stat>
			</Example>

			<Example
				title="With delta and description"
				code={code`
					import { ArrowUp } from 'lucide-react'
					import { Icon } from 'ui/icon'
					import { Stat, StatLabel, StatValue, StatDelta, StatDescription } from 'ui/stat'

					<Stat>
						<StatLabel>Monthly recurring revenue</StatLabel>
						<StatValue>$12,345</StatValue>
						<StatDelta trend="up">
							<Icon icon={<ArrowUp />} size="xs" />
							12.5%
						</StatDelta>
						<StatDescription>vs. last month</StatDescription>
					</Stat>
				`}
			>
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

			<Example
				title="Trends"
				code={code`
					import { StatDelta } from 'ui/stat'

					<StatDelta trend="up">+12.5%</StatDelta>
					<StatDelta trend="down">-4.2%</StatDelta>
					<StatDelta trend="neutral">0.0%</StatDelta>
				`}
			>
				<div className="flex flex-col gap-2">
					<StatDelta trend="up">
						<Icon icon={<ArrowUp />} size="xs" />
						12.5%
					</StatDelta>
					<StatDelta trend="down">
						<Icon icon={<ArrowDown />} size="xs" />
						4.2%
					</StatDelta>
					<StatDelta trend="neutral">0.0%</StatDelta>
				</div>
			</Example>

			<Example
				title="Value sizes"
				code={code`
					import { Stat, StatLabel, StatValue } from 'ui/stat'

					<StatValue size="sm">$1,234</StatValue>
					<StatValue size="md">$1,234</StatValue>
					<StatValue size="lg">$1,234</StatValue>
				`}
			>
				<div className="flex flex-wrap items-end gap-8">
					{(['sm', 'md', 'lg'] as const).map((s) => (
						<Stat key={s}>
							<StatLabel>Size {s}</StatLabel>
							<StatValue size={s}>$1,234</StatValue>
						</Stat>
					))}
				</div>
			</Example>

			<Example
				title="Dashboard grid"
				code={code`
					import { Card, CardBody } from 'ui/card'
					import { Stat, StatLabel, StatValue, StatDelta } from 'ui/stat'

					<div className="grid gap-4 sm:grid-cols-3">
						<Card variant="outline">
							<CardBody>
								<Stat>
									<StatLabel>Revenue</StatLabel>
									<StatValue>$12,345</StatValue>
									<StatDelta trend="up">+12.5%</StatDelta>
								</Stat>
							</CardBody>
						</Card>
						...
					</div>
				`}
			>
				<div className="grid gap-4 sm:grid-cols-3">
					<Card variant="outline">
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
					<Card variant="outline">
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
					<Card variant="outline">
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
		</div>
	)
}
