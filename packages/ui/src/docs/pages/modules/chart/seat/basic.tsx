import { SeatChart } from 'ui/chart'

export default function Basic() {
	return (
		<SeatChart
			aria-label="Senate seats"
			groups={[
				{ seats: 47, color: 'blue', label: 'Democrats' },
				{ seats: 6, color: 'zinc', label: 'Not called', hollow: true },
				{ seats: 47, color: 'red', label: 'Republicans' },
			]}
			majority={51}
		/>
	)
}
