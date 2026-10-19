import { ProgressBar } from 'ui/progress'

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

export default function Size() {
	return sizes.map((size) => (
		<ProgressBar key={size} size={size} value={75} aria-label="Upload progress" />
	))
}
