import { SeatChart } from 'ui/chart'
import { Stat, StatLabel, StatValue } from 'ui/stat'

export default function CenterContent() {
	return (
		<SeatChart
			aria-label="House seats"
			groups={[
				{ seats: 214, color: 'blue', label: 'Democrats' },
				{ seats: 18, color: 'zinc', label: 'Not called', hollow: true },
				{ seats: 203, color: 'red', label: 'Republicans' },
			]}
			majority={218}
		>
			<Stat>
				<StatLabel>To win</StatLabel>
				<StatValue>218</StatValue>
			</Stat>
		</SeatChart>
	)
}
