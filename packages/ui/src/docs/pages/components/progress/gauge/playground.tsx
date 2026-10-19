import { ProgressGauge, type ProgressGaugeProps } from 'ui/progress'

export default function ProgressGaugePlayground(props: ProgressGaugeProps) {
	return <ProgressGauge aria-label="Upload progress" {...props} />
}
