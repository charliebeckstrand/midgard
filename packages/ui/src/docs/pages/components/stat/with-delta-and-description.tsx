import { ArrowUp } from 'lucide-react'
import { Icon } from 'ui/icon'
import { Stat, StatDelta, StatDescription, StatLabel, StatValue } from 'ui/stat'

export default function WithDeltaAndDescription() {
	return (
		<Stat>
			<StatLabel>Monthly recurring revenue</StatLabel>
			<StatValue>$12,345</StatValue>
			<StatDelta trend="up">
				<Icon icon={<ArrowUp />} size="xs" />
				+12.5%
			</StatDelta>
			<StatDescription>vs. last month</StatDescription>
		</Stat>
	)
}
