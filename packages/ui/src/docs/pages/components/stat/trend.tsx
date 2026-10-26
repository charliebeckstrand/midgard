import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'
import { Icon } from 'ui/icon'
import { useIntl } from 'ui/primitives/intl'
import { StatDelta } from 'ui/stat'

// A change shows its sign, and no sign when it is zero.
const delta = { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 1 } as const

export default function Trend() {
	const intl = useIntl()

	return (
		<>
			<StatDelta trend="up">
				<Icon icon={<ArrowUp />} size="xs" />
				{intl.formatNumber(0.125, delta)}
			</StatDelta>
			<StatDelta trend="down">
				<Icon icon={<ArrowDown />} size="xs" />
				{intl.formatNumber(-0.008, delta)}
			</StatDelta>
			<StatDelta trend="neutral">
				<Icon icon={<ArrowRight />} size="xs" />
				{intl.formatNumber(0, delta)}
			</StatDelta>
		</>
	)
}
