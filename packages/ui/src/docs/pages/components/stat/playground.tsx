import { Stat, StatLabel, StatValue, type StatValueProps } from 'ui/stat'

export default function StatPlayground(props: StatValueProps) {
	return (
		<Stat>
			<StatLabel>Revenue</StatLabel>
			<StatValue {...props}>$1,234</StatValue>
		</Stat>
	)
}
