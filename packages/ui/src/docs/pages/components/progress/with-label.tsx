import { ProgressGauge } from 'ui/progress'

export default function WithLabel() {
	return <ProgressGauge value={80} size="lg" color="amber" centerLabel aria-label="Progress" />
}
