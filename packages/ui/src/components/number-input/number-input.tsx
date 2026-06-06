'use client'

import { Minus, Plus } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { k } from '../../recipes/kata/input'
import { Button } from '../button'
import type { ControlSize } from '../control/context'
import { useFormField } from '../form/context'
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
	const field = useFormField(name)

	const [current, setCurrent] = useControllable<number>({
		value: field ? (field.value as number) : value,
		defaultValue,
		onValueChange: field
			? (v) => {
					field.setValue(v)
					onValueChange?.(v)
				}
			: onValueChange,
	})

	const resolvedSize: ControlSize = size ?? 'md'

	const precision = step.toString().split('.')[1]?.length ?? 0

	const round = (n: number) => Number(n.toFixed(precision))

	const clamp = (n: number) => {
		if (min !== undefined && n < min) return min
		if (max !== undefined && n > max) return max

		return n
	}

	const change = (delta: number) => {
		setCurrent((prev) => (prev === undefined ? round(clamp(0)) : round(clamp(prev + delta))))
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

		// Store the raw value while typing; clamping mid-entry would make any
		// multi-digit value whose prefix falls outside [min, max] untypeable
		// (e.g. with min={10}, typing "1" would snap to "10"). Clamp on blur.
		setCurrent(n)
	}

	const handleBlur = () => {
		field?.setTouched()

		setCurrent((prev) => (prev === undefined ? undefined : round(clamp(prev))))
	}

	return (
		<Input
			ref={ref}
			type="number"
			inputMode="decimal"
			data-slot="number-input"
			name={name}
			disabled={disabled}
			size={resolvedSize}
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
