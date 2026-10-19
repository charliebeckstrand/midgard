import { ArrowUp } from 'lucide-react'
import { Icon } from 'ui/icon'
import { useIntl } from 'ui/primitives/intl'
import { Stat, StatDelta, StatDescription, StatLabel, StatValue } from 'ui/stat'

export default function WithDeltaAndDescription() {
	const intl = useIntl()

	return (
		<Stat>
			<StatLabel>Monthly recurring revenue</StatLabel>
			<StatValue>
				{intl.formatNumber(12345, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
			</StatValue>
			<StatDelta trend="up">
				<Icon icon={<ArrowUp />} size="xs" />
				+12.5%
			</StatDelta>
			<StatDescription>Since last month</StatDescription>
		</Stat>
	)
}
