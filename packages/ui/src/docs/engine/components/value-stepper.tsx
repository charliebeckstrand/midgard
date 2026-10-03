import { Minus, Plus } from 'lucide-react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { ariaAttr } from '../../../core/aria-attr'
import { dataAttr } from '../../../core/data-attr'

type ValueStepperProps = {
	value: number
	onValueChange: (value: number) => void
	min?: number
	max: number
	step?: number
	/** What the stepper drives, woven into each button's accessible name (`Decrease <label>`). */
	label: string
}

/**
 * A compact −/+ stepper for driving a numeric demo control, clamped to
 * `[min, max]`.
 *
 * @remarks
 * A button at its bound sets `aria-disabled` and `data-disabled`, not the
 * native `disabled`. A natively disabled button drops the focus to `<body>`
 * when a press reaches the bound, and the reader loses the place.
 */
export function ValueStepper({
	value,
	onValueChange,
	min = 0,
	max,
	step = 1,
	label,
}: ValueStepperProps) {
	const atMin = value <= min

	const atMax = value >= max

	return (
		<div className="flex items-center gap-1">
			<Button
				variant="plain"
				aria-label={`Decrease ${label}`}
				aria-disabled={ariaAttr(atMin)}
				data-disabled={dataAttr(atMin)}
				onClick={() => {
					if (!atMin) onValueChange(Math.max(min, value - step))
				}}
			>
				<Icon icon={<Minus />} />
			</Button>
			<Button
				variant="plain"
				aria-label={`Increase ${label}`}
				aria-disabled={ariaAttr(atMax)}
				data-disabled={dataAttr(atMax)}
				onClick={() => {
					if (!atMax) onValueChange(Math.min(max, value + step))
				}}
			>
				<Icon icon={<Plus />} />
			</Button>
		</div>
	)
}
