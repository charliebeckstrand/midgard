import { Sparkline, type SparklineProps } from 'ui/sparkline'
import { series } from './series.ts'

export default function SparklinePlayground(props: SparklineProps) {
	return <Sparkline {...props} data={series} aria-label="Weekly signups, up over 12 weeks" />
}
