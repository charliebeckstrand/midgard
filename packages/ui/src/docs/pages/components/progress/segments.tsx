import { ProgressBar } from 'ui/progress'

export default function Segments() {
	return (
		<ProgressBar
			max={435}
			segments={[
				{ value: 214, color: 'blue', label: 'Democrats' },
				{ value: 203, color: 'red', label: 'Republicans', from: 'end' },
			]}
			marks={[{ value: 218, label: '218 to win' }]}
			aria-label="House seats"
		/>
	)
}
