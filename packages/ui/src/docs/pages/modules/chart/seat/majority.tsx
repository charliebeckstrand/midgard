import { SeatChart } from 'ui/chart'

export default function Majority() {
	return (
		<SeatChart
			aria-label="House seats"
			groups={[
				{ seats: 214, color: 'blue', label: 'Democrats' },
				{ seats: 18, color: 'zinc', label: 'Not called', hollow: true },
				{ seats: 203, color: 'red', label: 'Republicans' },
			]}
			majority={218}
			majorityLabel
		/>
	)
}
