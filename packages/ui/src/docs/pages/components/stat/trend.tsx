import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'
import { Icon } from 'ui/icon'
import { StatDelta } from 'ui/stat'

export default function Trend() {
	return (
		<>
			<StatDelta trend="up">
				<Icon icon={<ArrowUp />} size="xs" />
				+12.5%
			</StatDelta>
			<StatDelta trend="down">
				<Icon icon={<ArrowDown />} size="xs" />
				−0.8%
			</StatDelta>
			<StatDelta trend="neutral">
				<Icon icon={<ArrowRight />} size="xs" />
				0%
			</StatDelta>
		</>
	)
}
