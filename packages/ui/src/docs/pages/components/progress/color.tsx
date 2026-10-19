import { ProgressBar } from 'ui/progress'

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

export default function Color() {
	return colors.map((color) => (
		<ProgressBar key={color} color={color} value={75} aria-label="Upload progress" />
	))
}
