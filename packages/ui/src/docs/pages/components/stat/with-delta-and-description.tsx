import { ArrowUp } from 'lucide-react'
import { Icon } from 'ui/icon'
import { useIntl } from 'ui/primitives/intl'
import { Stat, StatDelta, StatDescription, StatLabel, StatValue } from 'ui/stat'

// A change shows its sign, and no sign when it is zero.
const delta = { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 1 } as const

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
				{intl.formatNumber(0.125, delta)}
			</StatDelta>
			<StatDescription>Since last month</StatDescription>
		</Stat>
	)
}
