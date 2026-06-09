'use client'

import { Minus, Plus } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/input'
import { clamp } from '../../utilities'
import { Button } from '../button'
import type { ControlSize } from '../control/context'
import { useFormValue } from '../form/use-form-value'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'

const padding: Record<ControlSize, string> = {
	sm: 'pr-16',
	md: 'pr-18',
	lg: 'pr-20',
}

export type NumberInputProps = Omit<
	InputProps,
	'type' | 'value' | 'defaultValue' | 'onChange' | 'suffix' | 'prefix' | 'min' | 'max' | 'step'
> & {
	value?: number | null
	defaultValue?: number
	onValueChange?: (value: number | undefined) => void
	min?: number
	max?: number
	step?: number
}

/** Numeric Input with stepper buttons — clamps to `min`/`max` and rounds to `step` precision on blur rather than mid-entry, and binds to an enclosing Form field by `name`. */
export function NumberInput({
	value,
	defaultValue,
	onValueChange,
	min,
	max,
	step = 1,
	disabled,
	size,
	className,
	name,
	ref,
	...props
}: NumberInputProps) {
	const {
		value: current,
		setValue: setCurrent,
		setTouched,
	} = useFormValue<number>(name, { value, defaultValue, onValueChange })

	const inherited = useDensity()

	// `size` passes through untouched to `<Input>` for the full density token;
	// resolved locally only to pick the padding that clears the stepper buttons.
	const resolvedSize: ControlSize = size ?? inherited.size

	const precision = step.toString().split('.')[1]?.length ?? 0

	const round = (n: number) => Number(n.toFixed(precision))

	const clampValue = (n: number) =>
		clamp(n, min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY)

	const change = (delta: number) => {
		setCurrent((prev) =>
			prev === undefined ? round(clampValue(0)) : round(clampValue(prev + delta)),
		)
	}

	const atMin = min !== undefined && current !== undefined && current <= min
	const atMax = max !== undefined && current !== undefined && current >= max

	const decrease = () => change(-step)
	const increase = () => change(step)

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		const v = e.target.value

		if (v === '') {
			setCurrent(undefined)

			return
		}

		const n = Number(v)

		if (Number.isNaN(n)) return

		// Stores the raw value while typing; clamps on blur instead.
		setCurrent(n)
	}

	const handleBlur = () => {
		setTouched()

		setCurrent((prev) => (prev === undefined ? undefined : round(clampValue(prev))))
	}

	return (
		<Input
			ref={ref}
			type="number"
			inputMode="decimal"
			data-slot="number-input"
			name={name}
			disabled={disabled}
			size={size}
			value={current ?? ''}
			onChange={handleChange}
			onBlur={handleBlur}
			min={min}
			max={max}
			step={step}
			className={cn(padding[resolvedSize], k.number, className)}
			suffix={
				<span className="pointer-events-auto flex items-center gap-0.5">
					<Button
						variant="plain"
						spring={false}
						tabIndex={-1}
						disabled={disabled || atMin}
						aria-label="Decrease"
						onClick={decrease}
					>
						<Icon icon={<Minus />} />
					</Button>
					<Button
						variant="plain"
						spring={false}
						tabIndex={-1}
						disabled={disabled || atMax}
						aria-label="Increase"
						onClick={increase}
					>
						<Icon icon={<Plus />} />
					</Button>
				</span>
			}
			{...props}
		/>
	)
}
