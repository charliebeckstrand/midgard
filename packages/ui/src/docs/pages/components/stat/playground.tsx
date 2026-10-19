import { useIntl } from 'ui/primitives/intl'
import { Stat, StatLabel, StatValue, type StatValueProps } from 'ui/stat'

export default function StatPlayground(props: StatValueProps) {
	const intl = useIntl()

	return (
		<Stat>
			<StatLabel>Revenue</StatLabel>
			<StatValue {...props}>
				{intl.formatNumber(1234, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
			</StatValue>
		</Stat>
	)
}
